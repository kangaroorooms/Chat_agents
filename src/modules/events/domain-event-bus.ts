import { EventEmitter } from 'events'
import type { DomainEventName, DomainEventPayloadMap } from './domain-events'

export interface DomainEventBus {
  emit<K extends DomainEventName>(event: K, payload: DomainEventPayloadMap[K]): boolean
  on<K extends DomainEventName>(event: K, listener: (payload: DomainEventPayloadMap[K]) => void): this
  off<K extends DomainEventName>(event: K, listener: (payload: DomainEventPayloadMap[K]) => void): this
}

class NodeDomainEventBus implements DomainEventBus {
  private emitter = new EventEmitter()

  emit<K extends DomainEventName>(event: K, payload: DomainEventPayloadMap[K]) {
    return this.emitter.emit(event, payload)
  }

  on<K extends DomainEventName>(event: K, listener: (payload: DomainEventPayloadMap[K]) => void) {
    this.emitter.on(event, listener)
    return this
  }

  off<K extends DomainEventName>(event: K, listener: (payload: DomainEventPayloadMap[K]) => void) {
    this.emitter.off(event, listener)
    return this
  }
}

export const domainEventBus = new NodeDomainEventBus()
