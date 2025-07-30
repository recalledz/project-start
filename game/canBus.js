class CANBus {
  constructor() {
    this.handlers = {};
  }
  subscribe(event, fn) {
    (this.handlers[event] ||= []).push(fn);
  }
  publish(event, payload) {
    (this.handlers[event] || []).forEach(fn => fn(payload));
  }
}

export default new CANBus();
