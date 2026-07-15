export type ComponentType = 'button' | 'select';
export interface BaseComponent {
    id: string;             // уникальный идентификатор действия
    type: ComponentType;    // button или select
    label: string;          // текст на кнопке/пункте
    style: 'primary'|'secondary'|'danger';  // (опционально)
  }
  
  export interface ButtonComponent extends BaseComponent {
    type: 'button';
  }
  
  export interface SelectComponent extends BaseComponent {
    type: 'select';
    options: { value: string; label: string }[];
  }
  
  export type Component = ButtonComponent | SelectComponent;
type Payload = {
    text: string;
    components: Component[];
    }

type InteractionHandler = (evt: {
    userId: string;
    type: 'command' | 'button';
    name: string;
    payload: any;
}) => Payload;


interface  Adapter {
    start(): Promise<void>;
    registerCommands(): Promise<void>;
    onInteraction(handler: InteractionHandler): Promise<void>;
    onNotification(userId: string, payload: Payload): Promise<void>;
  }

export { type Adapter, type InteractionHandler, type Payload }