type Handler<T> = (payload: T) => void;

export class EventBus<Topic extends string> {
  private map = new Map<Topic, Set<Handler<any>>>();

  on<T = any>(topic: Topic, fn: Handler<T>): () => void {
    let set = this.map.get(topic);
    if (!set) { set = new Set(); this.map.set(topic, set); }
    set.add(fn as Handler<any>);
    return () => set!.delete(fn as Handler<any>);
  }

  emit<T = any>(topic: Topic, payload: T): void {
    const set = this.map.get(topic);
    if (!set || set.size === 0) return;
    for (const fn of set) {
      try { (fn as Handler<T>)(payload); } catch {}
    }
  }

  clear(topic?: Topic) {
    if (!topic) this.map.clear();
    else this.map.get(topic)?.clear();
  }
}
