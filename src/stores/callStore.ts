import { create } from 'zustand';
import { CallSession } from '@/types';

interface CallState {
  activeCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: 'idle' | 'ringing' | 'receiving' | 'active' | 'ended';
  isMuted: boolean;
  isVideoOn: boolean;

  setActiveCall: (call: CallSession | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setCallStatus: (status: 'idle' | 'ringing' | 'receiving' | 'active' | 'ended') => void;
  setIsMuted: (isMuted: boolean) => void;
  setIsVideoOn: (isVideoOn: boolean) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  localStream: null,
  remoteStream: null,
  callStatus: 'idle',
  isMuted: false,
  isVideoOn: false,

  setActiveCall: (call) => set({ activeCall: call }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setCallStatus: (status) => set({ callStatus: status }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setIsVideoOn: (isVideoOn) => set({ isVideoOn }),
  resetCall: () =>
    set((state) => {
      // Stop media tracks if they exist
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => track.stop());
      }
      if (state.remoteStream) {
        state.remoteStream.getTracks().forEach((track) => track.stop());
      }
      return {
        activeCall: null,
        localStream: null,
        remoteStream: null,
        callStatus: 'idle',
        isMuted: false,
        isVideoOn: false,
      };
    }),
}));
