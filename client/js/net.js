/* global io */
export const socket = io();
export const cmd = (name, payload = {}) => socket.emit('cmd', { cmd: name, ...payload });
