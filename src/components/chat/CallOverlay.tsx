'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, RotateCcw } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const CallOverlay: React.FC = () => {
  const { callState, setCallState, conversations } = useChatStore();
  const { user, profile } = useAuthStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const callStateRefForLog = useRef(callState);
  const callDurationRefForLog = useRef(callDuration);

  // Group call states
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // Group call refs
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const groupChannelRef = useRef<any>(null);
  const candidatesQueuesRef = useRef<Record<string, any[]>>({});

  useEffect(() => {
    if (callState) {
      callStateRefForLog.current = callState;
    }
  }, [callState]);

  useEffect(() => {
    if (callState) {
      callDurationRefForLog.current = callDuration;
    }
  }, [callDuration, callState]);

  // WebRTC & Stream states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);

  // Refs for peer connection and DOM elements
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // ICE Candidates queue to resolve race condition where candidates arrive before remote description is set
  const candidatesQueueRef = useRef<any[]>([]);

  // Signaling channel refs
  const incomingChannelRef = useRef<any>(null);
  const outgoingChannelRef = useRef<any>(null);

  const conversation = conversations.find((c) => c.id === callState?.conversationId);
  const otherMember = conversation?.members?.find((m) => m.user_id !== user?.id);
  const displayName = conversation?.name || otherMember?.profile?.display_name || 'Unknown';
  const avatarUrl = conversation?.type === 'direct'
    ? otherMember?.profile?.avatar_url
    : conversation?.avatar_url;

  // Active call duration timer
  useEffect(() => {
    if (callState?.status === 'active') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState?.status]);

  // Reset duration when call ends
  useEffect(() => {
    if (!callState) setCallDuration(0);
  }, [callState]);

  // WebRTC Cleanup
  const cleanupCall = () => {
    console.log('Cleaning up WebRTC Call...');
    
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Stop all remote tracks
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    candidatesQueueRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteVideoActive(false);
  };

  // Process any ICE candidates that were queued before remote description was set
  const processCandidatesQueue = async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) return;
    console.log(`Processing ${candidatesQueueRef.current.length} queued ICE candidates`);
    for (const candidate of candidatesQueueRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Error adding queued ICE candidate', e);
      }
    }
    candidatesQueueRef.current = [];
  };

  // Broadcast signaling event on main call-signal channel
  const broadcastSignal = async (event: string) => {
    if (!callState?.callPartnerId) return;
    const ch = supabase.channel(`call-signal:${callState.callPartnerId}`);
    await ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.send({ type: 'broadcast', event, payload: {} });
        setTimeout(() => supabase.removeChannel(ch), 2000);
      }
    });
  };

  const handleAccept = async () => {
    await broadcastSignal('call_accepted');
    setCallState(callState ? { ...callState, status: 'active' } : null);
  };

  const handleEnd = async () => {
    if (callState?.isGroupCall) {
      cleanupCall();
      setCallState(null);
      return;
    }
    await broadcastSignal('call_ended');
    cleanupCall();
    setCallState(null);
  };


  // Setup WebRTC and signaling when call is active
  useEffect(() => {
    if (!callState) {
      cleanupCall();
      return;
    }

    if (callState.status !== 'active' || !user) return;

    const partnerId = callState.callPartnerId;
    const isVideo = callState.type === 'video';

    const startCall = async () => {
      console.log('Starting WebRTC connection...');

      // 1. Get user media stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo ? { width: 1280, height: 720 } : false,
          audio: true,
        });
      } catch (err) {
        console.warn('Camera/mic access failed, trying audio-only...', err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
        } catch (audioErr) {
          toast.error('Could not access microphone or camera.');
          return;
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply initial mute / camera state
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOff;
      });

      // 2. Initialize Peer Connection
      const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      const stunEnv = process.env.NEXT_PUBLIC_STUN_SERVER || '';
      if (stunEnv) {
        iceServers.unshift({ urls: stunEnv });
      }

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // 3. Add tracks to Peer Connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 4. Handle remote track arrival by building a stable MediaStream
      const remoteMediaStream = new MediaStream();
      remoteStreamRef.current = remoteMediaStream;
      setRemoteStream(remoteMediaStream);

      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (remoteStreamRef.current) {
          remoteStreamRef.current.addTrack(event.track);
          // Set new reference wrapper to trigger React re-binding
          setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
        }
      };

      // 5. Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && outgoingChannelRef.current) {
          outgoingChannelRef.current.send({
            type: 'broadcast',
            event: 'webrtc_candidate',
            payload: { candidate: event.candidate },
          });
        }
      };

      // 6. Connect signaling channels
      const incomingChannelName = `webrtc-signal:${user.id}`;
      const outgoingChannelName = `webrtc-signal:${partnerId}`;

      const incomingChannel = supabase.channel(incomingChannelName);
      const outgoingChannel = supabase.channel(outgoingChannelName);

      incomingChannel
        .on('broadcast', { event: 'webrtc_offer' }, async (payload) => {
          const { sdp } = payload.payload;
          if (!pcRef.current) return;
          console.log('Setting remote description (Offer)');
          await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
          
          console.log('Creating Answer...');
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          
          await outgoingChannel.send({
            type: 'broadcast',
            event: 'webrtc_answer',
            payload: { sdp: answer.sdp },
          });

          // Process ICE candidates now that description is set
          await processCandidatesQueue();
        })
        .on('broadcast', { event: 'webrtc_answer' }, async (payload) => {
          const { sdp } = payload.payload;
          if (!pcRef.current) return;
          console.log('Setting remote description (Answer)');
          await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));

          // Process ICE candidates now that description is set
          await processCandidatesQueue();
        })
        .on('broadcast', { event: 'webrtc_candidate' }, async (payload) => {
          const { candidate } = payload.payload;
          if (!pcRef.current) return;
          
          if (pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn('Error adding received ICE candidate', e);
            }
          } else {
            console.log('Queuing ICE candidate (remote description not set yet)');
            candidatesQueueRef.current.push(candidate);
          }
        });

      incomingChannel.subscribe();
      outgoingChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          outgoingChannelRef.current = outgoingChannel;
          // If Caller, initiate negotiation
          if (callState.isOutgoing) {
            console.log('Caller initiating negotiation offer...');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await outgoingChannel.send({
              type: 'broadcast',
              event: 'webrtc_offer',
              payload: { sdp: offer.sdp },
            });
          }
        }
      });

      incomingChannelRef.current = incomingChannel;
    };

    startCall();

    return () => {
      if (incomingChannelRef.current) supabase.removeChannel(incomingChannelRef.current);
      if (outgoingChannelRef.current) supabase.removeChannel(outgoingChannelRef.current);
      incomingChannelRef.current = null;
      outgoingChannelRef.current = null;
    };
  }, [callState?.status, callState?.callPartnerId]);

  // Mesh WebRTC Group Call coordination
  useEffect(() => {
    if (!callState || !callState.isGroupCall || !user || !profile) return;

    const conversationId = callState.conversationId;
    const isVideo = callState.type === 'video';

    const startGroupCall = async () => {
      console.log('Starting mesh WebRTC Group Call...');

      // 1. Get local stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo ? { width: 640, height: 480 } : false,
          audio: true,
        });
      } catch (err) {
        console.warn('Camera/mic access failed, trying audio-only...', err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
        } catch (audioErr) {
          toast.error('Could not access microphone or camera.');
          return;
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply initial mute / camera states
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOff;
      });

      // 2. Join presence channel for group call status tracking
      const groupChannelName = `group-call:${conversationId}`;
      const groupChannel = supabase.channel(groupChannelName);
      groupChannelRef.current = groupChannel;

      groupChannel
        .on('presence', { event: 'sync' }, async () => {
          const state = groupChannel.presenceState();
          const participants: any[] = [];
          Object.keys(state).forEach((key) => {
            const presArray = state[key];
            if (Array.isArray(presArray)) {
              presArray.forEach((pres: any) => {
                participants.push(pres);
              });
            }
          });

          setGroupParticipants(participants);

          // Find participants who left and clean them up
          Object.keys(pcsRef.current).forEach((pId) => {
            if (!participants.some((p) => p.user_id === pId)) {
              console.log(`Participant ${pId} left group call. Cleaning up.`);
              if (pcsRef.current[pId]) {
                pcsRef.current[pId].close();
                delete pcsRef.current[pId];
              }
              if (remoteStreamsRef.current[pId]) {
                remoteStreamsRef.current[pId].getTracks().forEach((t) => t.stop());
                delete remoteStreamsRef.current[pId];
              }
              delete candidatesQueuesRef.current[pId];
            }
          });
          setRemoteStreams({ ...remoteStreamsRef.current });

          // Establish connection with any new participant
          for (const p of participants) {
            if (p.user_id === user.id) continue;

            if (!pcsRef.current[p.user_id]) {
              console.log(`Discovered user in group call: ${p.user_id}. Connecting...`);
              const pc = createPeerConnectionForUser(p.user_id, stream);
              pcsRef.current[p.user_id] = pc;

              // The peer with the lexicographically smaller ID initiates negotiation
              if (user.id < p.user_id) {
                console.log(`Initiating offer to ${p.user_id}`);
                try {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);

                  await sendGroupSignaling(p.user_id, {
                    event: 'webrtc_offer',
                    sdp: offer.sdp,
                  });
                } catch (e) {
                  console.error('Error negotiating with user', p.user_id, e);
                }
              }
            }
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await groupChannel.track({
              user_id: user.id,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              is_video: isVideo,
              is_muted: isMuted,
              camera_disabled: isCameraOff,
              joined_at: new Date().toISOString(),
            });
          }
        });

      // 3. Subscribe to personal signaling channel for group call inputs
      const personalSignalingChannel = supabase.channel(`webrtc-signal:${user.id}`);
      
      personalSignalingChannel
        .on('broadcast', { event: 'webrtc_offer' }, async (payload) => {
          const { fromUserId, sdp } = payload.payload as { fromUserId: string; sdp: string };
          if (!fromUserId) return;

          let pc = pcsRef.current[fromUserId];
          if (!pc) {
            pc = createPeerConnectionForUser(fromUserId, stream);
            pcsRef.current[fromUserId] = pc;
          }

          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await sendGroupSignaling(fromUserId, {
              event: 'webrtc_answer',
              sdp: answer.sdp,
            });

            // Process queued candidates
            const queue = candidatesQueuesRef.current[fromUserId] || [];
            for (const cand of queue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('Error adding candidate', e);
              }
            }
            candidatesQueuesRef.current[fromUserId] = [];
          } catch (err) {
            console.error('Error handling group call offer from', fromUserId, err);
          }
        })
        .on('broadcast', { event: 'webrtc_answer' }, async (payload) => {
          const { fromUserId, sdp } = payload.payload as { fromUserId: string; sdp: string };
          if (!fromUserId) return;

          const pc = pcsRef.current[fromUserId];
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
              
              const queue = candidatesQueuesRef.current[fromUserId] || [];
              for (const cand of queue) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                  console.warn('Error adding candidate', e);
                }
              }
              candidatesQueuesRef.current[fromUserId] = [];
            } catch (err) {
              console.error('Error setting group call answer description', fromUserId, err);
            }
          }
        })
        .on('broadcast', { event: 'webrtc_candidate' }, async (payload) => {
          const { fromUserId, candidate } = payload.payload as { fromUserId: string; candidate: any };
          if (!fromUserId) return;

          const pc = pcsRef.current[fromUserId];
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn('Error adding group call candidate', e);
            }
          } else {
            if (!candidatesQueuesRef.current[fromUserId]) {
              candidatesQueuesRef.current[fromUserId] = [];
            }
            candidatesQueuesRef.current[fromUserId].push(candidate);
          }
        })
        .subscribe();
    };

    const sendGroupSignaling = async (targetUserId: string, data: any) => {
      const ch = supabase.channel(`webrtc-signal:${targetUserId}`);
      await ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.send({
            type: 'broadcast',
            event: data.event,
            payload: {
              fromUserId: user.id,
              ...data,
            },
          });
          setTimeout(() => supabase.removeChannel(ch), 2000);
        }
      });
    };

    const createPeerConnectionForUser = (targetUserId: string, localMediaStream: MediaStream) => {
      const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      const stunEnv = process.env.NEXT_PUBLIC_STUN_SERVER || '';
      if (stunEnv) iceServers.unshift({ urls: stunEnv });

      const pc = new RTCPeerConnection({ iceServers });

      localMediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, localMediaStream);
      });

      pc.ontrack = (event) => {
        console.log(`Received track from ${targetUserId}:`, event.track.kind);
        if (!remoteStreamsRef.current[targetUserId]) {
          remoteStreamsRef.current[targetUserId] = new MediaStream();
        }
        remoteStreamsRef.current[targetUserId].addTrack(event.track);

        setRemoteStreams({
          ...remoteStreamsRef.current,
          [targetUserId]: new MediaStream(remoteStreamsRef.current[targetUserId].getTracks()),
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendGroupSignaling(targetUserId, {
            event: 'webrtc_candidate',
            candidate: event.candidate,
          });
        }
      };

      return pc;
    };

    startGroupCall();

    return () => {
      console.log('Cleaning up Group Call resources...');
      if (groupChannelRef.current) {
        supabase.removeChannel(groupChannelRef.current);
        groupChannelRef.current = null;
      }

      Object.keys(pcsRef.current).forEach((pId) => {
        if (pcsRef.current[pId]) {
          pcsRef.current[pId].close();
        }
      });
      pcsRef.current = {};

      Object.keys(remoteStreamsRef.current).forEach((pId) => {
        if (remoteStreamsRef.current[pId]) {
          remoteStreamsRef.current[pId].getTracks().forEach((t) => t.stop());
        }
      });
      remoteStreamsRef.current = {};
      candidatesQueuesRef.current = {};

      setGroupParticipants([]);
      setRemoteStreams({});
    };
  }, [callState?.status, callState?.isGroupCall]);

  // Sync mute/camera states inside group presence
  useEffect(() => {
    if (groupChannelRef.current && user && profile && callState?.isGroupCall) {
      groupChannelRef.current.track({
        user_id: user.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        is_video: callState.type === 'video',
        is_muted: isMuted,
        camera_disabled: isCameraOff,
        joined_at: new Date().toISOString(),
      });
    }
  }, [isMuted, isCameraOff, user, profile, callState]);

  // Bind local/remote streams to HTML video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoActive]);

  // Sync mute control to media stream track
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // Sync camera control to media stream track
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOff;
      });
    }
  }, [isCameraOff, localStream]);

  // Track remote video activity
  useEffect(() => {
    if (!remoteStream) {
      setRemoteVideoActive(false);
      return;
    }
    const checkTracks = () => {
      const active = remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
      setRemoteVideoActive(active);
    };

    checkTracks();
    const interval = setInterval(checkTracks, 1000);
    return () => clearInterval(interval);
  }, [remoteStream]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const logCallMessage = async (state: any, finalDuration: number) => {
    if (!state.isOutgoing || !user || state.isGroupCall) return;

    const isVideo = state.type === 'video';
    const isCompleted = state.status === 'active';

    try {
      await supabase.from('messages').insert({
        conversation_id: state.conversationId,
        sender_id: user.id,
        content: isVideo ? 'video' : 'voice',
        type: 'call',
        media_name: isCompleted ? 'completed' : 'missed',
        media_duration: finalDuration,
      });
    } catch (err) {
      console.error('Failed to log call history message:', err);
    }
  };

  useEffect(() => {
    return () => {
      const finalState = callStateRefForLog.current;
      const finalDuration = callDurationRefForLog.current;

      if (finalState && finalState.isOutgoing) {
        logCallMessage(finalState, finalDuration);
      }
    };
  }, []);

  if (!callState) return null;

  const renderGroupCall = () => {
    const isVideo = callState.type === 'video';
    
    const localParticipant = {
      user_id: user?.id || 'me',
      display_name: profile?.display_name || 'Me',
      avatar_url: profile?.avatar_url || null,
      is_local: true,
      is_muted: isMuted,
      camera_disabled: isCameraOff,
      stream: localStream,
    };

    const otherParticipants = groupParticipants
      .filter((p) => p.user_id !== user?.id)
      .map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url || null,
        is_local: false,
        is_muted: p.is_muted,
        camera_disabled: p.camera_disabled,
        stream: remoteStreams[p.user_id] || null,
      }));

    const allParticipants = [localParticipant, ...otherParticipants];

    const gridColsClass = allParticipants.length === 1 
      ? 'grid-cols-1 max-w-sm' 
      : allParticipants.length === 2 
      ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-4xl';

    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between select-none overflow-hidden py-14">
        {/* Backdrop */}
        <div
          className="absolute inset-0 transition-all duration-750 z-0"
          style={{
            background: isVideo
              ? 'radial-gradient(circle at center, #1c2230 0%, #0e121a 100%)'
              : 'radial-gradient(circle at center, #1b262d 0%, #0f1619 100%)',
          }}
        />

        {/* Group Call Info */}
        <div className="relative z-10 text-white text-center">
          <h2 className="text-xl font-bold tracking-tight mb-0.5 drop-shadow-md">
            {conversation?.name || 'Group Chat'}
          </h2>
          <p className="text-xs font-medium text-white/70 drop-shadow-md">
            Group {isVideo ? 'Video' : 'Voice'} Call • {formatDuration(callDuration)}
          </p>
          <p className="text-[10px] text-white/55 mt-0.5 drop-shadow-md font-medium">
            {allParticipants.length} participant{allParticipants.length > 1 ? 's' : ''} in call
          </p>
        </div>

        {/* Participants Grid */}
        <div className="relative z-10 w-full flex-1 flex items-center justify-center px-6 my-6 overflow-y-auto">
          <div className={`grid gap-4 w-full justify-center items-center overflow-y-auto ${gridColsClass}`}>
            {allParticipants.map((p) => {
              const showCam = isVideo && !p.camera_disabled && p.stream;
              return (
                <div
                  key={p.user_id}
                  className="relative rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md overflow-hidden aspect-video flex items-center justify-center shadow-lg w-full max-w-[280px] sm:max-w-none"
                >
                  {showCam ? (
                    <VideoRenderer stream={p.stream} isLocal={p.is_local} />
                  ) : (
                    // Avatar fallback
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 relative flex items-center justify-center bg-white/5 shadow-md">
                        <Avatar
                          name={p.display_name}
                          src={p.avatar_url}
                          size="md"
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Overlay */}
                  <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded bg-black/60 text-[9px] font-semibold text-white/90">
                    {p.display_name} {p.is_local ? '(You)' : ''}
                  </div>

                  {p.is_muted && (
                    <div className="absolute top-2 right-3 p-1 rounded-full bg-red-500/80 text-white">
                      <MicOff size={10} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls Panel */}
        <div className="relative z-10 w-full px-6 max-w-sm flex justify-around bg-black/45 backdrop-blur-md border border-white/10 rounded-3xl py-4 shadow-2xl">
          {/* Speaker / Flip */}
          {!isVideo ? (
            <div className="flex flex-col items-center gap-1">
              <motion.button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isSpeakerOn 
                    ? 'bg-white text-black shadow-lg scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/25 border border-white/10'
                }`}
              >
                <Volume2 size={18} />
              </motion.button>
              <span className="text-[9px] font-medium text-white/65">Speaker</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/25 flex items-center justify-center transition-all border border-white/10"
              >
                <RotateCcw size={18} />
              </motion.button>
              <span className="text-[9px] font-medium text-white/65">Flip</span>
            </div>
          )}

          {/* Camera On/Off Toggle */}
          {isVideo ? (
            <div className="flex flex-col items-center gap-1">
              <motion.button
                onClick={() => setIsCameraOff(!isCameraOff)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isCameraOff 
                    ? 'bg-white text-black shadow-lg' 
                    : 'bg-white/10 text-white hover:bg-white/25 border border-white/10'
                }`}
              >
                {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
              </motion.button>
              <span className="text-[9px] font-medium text-white/65">{isCameraOff ? 'Cam On' : 'Cam Off'}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-40 cursor-not-allowed">
              <button disabled className="w-12 h-12 rounded-full bg-white/5 text-white/40 flex items-center justify-center border border-white/5">
                <Video size={18} />
              </button>
              <span className="text-[9px] font-medium text-white/40">Video</span>
            </div>
          )}

          {/* Mute Microphone */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              onClick={() => setIsMuted(!isMuted)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted 
                  ? 'bg-white text-black shadow-lg scale-105' 
                  : 'bg-white/10 text-white hover:bg-white/25 border border-white/10'
              }`}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </motion.button>
            <span className="text-[9px] font-medium text-white/65">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          {/* Leave Call Button */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              onClick={handleEnd}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg text-white"
            >
              <PhoneOff size={18} />
            </motion.button>
            <span className="text-[9px] font-medium text-white/65">Leave</span>
          </div>
        </div>
      </div>
    );
  };



  if (callState.isGroupCall) {
    return renderGroupCall();
  }

  const isVideo = callState.type === 'video';
  const isActive = callState.status === 'active';
  const isOutgoing = callState.isOutgoing;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center select-none overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 transition-all duration-750"
            style={{
              background: isVideo
                ? 'radial-gradient(circle at center, #1c2230 0%, #0e121a 100%)'
                : 'radial-gradient(circle at center, #1b262d 0%, #0f1619 100%)',
            }}
          />

      {/* Fullscreen Remote Video Feed - Keep always mounted to avoid binding lost refs */}
      {isActive && isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${
            remoteVideoActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

      {/* Floating Local Video PIP - Keep always mounted to preserve srcObject */}
      {isActive && isVideo && (
        <div className="absolute bottom-28 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-xl border border-white/20 shadow-2xl z-20 bg-bg-sidebar overflow-hidden flex items-center justify-center">
          {/* Avatar Placeholder shown when camera is off */}
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-bg-sidebar">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                <Avatar
                  name={user?.user_metadata?.display_name || 'Me'}
                  src={profile?.avatar_url || null}
                  size="sm"
                />
              </div>
            </div>
          )}
          {/* Video element always mounted, hidden visually if camera off */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraOff ? 'invisible' : 'visible'}`}
          />
        </div>
      )}

      {/* Overlay controls layer */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full py-16 w-full max-w-sm mx-auto text-white text-center">
        
        {/* Call Info (Name & Duration) */}
        <div className="flex flex-col items-center">
          {/* Pulse ring for ringing state */}
          {(!isVideo || !remoteVideoActive) && (
            <div className="relative mb-6">
              {!isOutgoing && !isActive && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.4, 0.15] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-green-500"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.05, 0.25, 0.05] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
                    className="absolute inset-0 rounded-full bg-green-500"
                  />
                </>
              )}
              {isOutgoing && !isActive && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.4, 0.15] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-accent"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.05, 0.25, 0.05] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
                    className="absolute inset-0 rounded-full bg-accent"
                  />
                </>
              )}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl relative z-10 flex items-center justify-center">
                <Avatar
                  name={displayName}
                  src={avatarUrl || null}
                  size="xl"
                />
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1 drop-shadow-md">{displayName}</h2>
            <p className="text-sm font-medium text-white/70 drop-shadow-md">
              {isActive
                ? formatDuration(callDuration)
                : isOutgoing
                ? isVideo ? 'Video calling...' : 'Calling...'
                : isVideo ? 'Incoming video call...' : 'Incoming voice call...'}
            </p>
            {isActive && (
              <p className="text-xs text-white/55 mt-1 drop-shadow-md">
                {isVideo ? (remoteVideoActive ? '📹 Connected' : '📹 Remote camera off') : '🔊 Connected'}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full px-6 flex flex-col gap-8">
          
          {/* Ringing Controls (Incoming vs Outgoing) */}
          {!isActive && (
            <div className="flex items-center justify-center gap-12">
              {isOutgoing ? (
                // Outgoing - Cancel
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    onClick={handleEnd}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center transition-all shadow-lg text-white"
                  >
                    <PhoneOff size={22} />
                  </motion.button>
                  <span className="text-xs text-white/70 font-medium drop-shadow-sm">Cancel</span>
                </div>
              ) : (
                // Incoming - Decline & Accept
                <>
                  <div className="flex flex-col items-center gap-2">
                    <motion.button
                      onClick={handleEnd}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center transition-all shadow-lg text-white"
                    >
                      <PhoneOff size={22} />
                    </motion.button>
                    <span className="text-xs text-white/70 font-medium drop-shadow-sm">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <motion.button
                      onClick={handleAccept}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center transition-all shadow-lg text-white animate-bounce"
                    >
                      {isVideo ? <Video size={22} /> : <Phone size={22} />}
                    </motion.button>
                    <span className="text-xs text-white/70 font-medium drop-shadow-sm">Accept</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Active Call Controls */}
          {isActive && (
            <div className="flex items-center justify-around w-full max-w-sm mx-auto bg-black/45 backdrop-blur-md border border-white/10 rounded-3xl py-4 px-6 shadow-2xl">
              {/* Speaker Toggle (Voice call) or Flip Camera (Video call) */}
              {!isVideo ? (
                <div className="flex flex-col items-center gap-1">
                  <motion.button
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isSpeakerOn 
                        ? 'bg-white text-black shadow-lg scale-105' 
                        : 'bg-white/10 text-white hover:bg-white/25 border border-white/10'
                    }`}
                  >
                    <Volume2 size={18} />
                  </motion.button>
                  <span className="text-[9px] font-medium text-white/65">Speaker</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/25 flex items-center justify-center transition-all border border-white/10"
                  >
                    <RotateCcw size={18} />
                  </motion.button>
                  <span className="text-[9px] font-medium text-white/65">Flip</span>
                </div>
              )}

              {/* Video camera Toggle (Voice call - disabled/greyed out, or Video call - active toggle) */}
              {isVideo ? (
                <div className="flex flex-col items-center gap-1">
                  <motion.button
                    onClick={() => setIsCameraOff(!isCameraOff)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isCameraOff 
                        ? 'bg-white text-black shadow-lg' 
                        : 'bg-white/10 text-white hover:bg-white/25 border border-white/10'
                    }`}
                  >
                    {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
                  </motion.button>
                  <span className="text-[9px] font-medium text-white/65">{isCameraOff ? 'Cam On' : 'Cam Off'}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-40 cursor-not-allowed">
                  <button disabled className="w-12 h-12 rounded-full bg-white/5 text-white/40 flex items-center justify-center border border-white/5">
                    <Video size={18} />
                  </button>
                  <span className="text-[9px] font-medium text-white/40">Video</span>
                </div>
              )}

              {/* Mute Mic */}
              <div className="flex flex-col items-center gap-1">
                <motion.button
                  onClick={() => setIsMuted(!isMuted)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isMuted 
                      ? 'bg-white text-black shadow-lg scale-105' 
                      : 'bg-white/10 text-white hover:bg-white/25 border border-white/10'
                  }`}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </motion.button>
                <span className="text-[9px] font-medium text-white/65">{isMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {/* End Call Button */}
              <div className="flex flex-col items-center gap-1">
                <motion.button
                  onClick={handleEnd}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg text-white"
                >
                  <PhoneOff size={18} />
                </motion.button>
                <span className="text-[9px] font-medium text-white/65">End</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CallOverlay;

const VideoRenderer: React.FC<{ stream: MediaStream | null; isLocal?: boolean }> = ({ stream, isLocal }) => {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={isLocal}
      className="w-full h-full object-cover"
    />
  );
};
