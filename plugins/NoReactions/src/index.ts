import { before } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";

const Dispatcher = findByProps("dispatch", "subscribe");
const UserStore = findByProps("getCurrentUser", "getUser");
const MessageStore = findByProps("getMessage", "getMessages");

let unpatch: () => void;

const removeReactions = (msg: any, currentUserId: string) => {
    if (!msg || !Array.isArray(msg.reactions) || !currentUserId) return;
    if (msg.author?.id !== currentUserId) return;
    
    msg.reactions = msg.reactions.filter((r: any) => r.me === true);
    
    msg.reactions.forEach((r: any) => {
        r.count = 1;
    });
};

export default {
    onLoad: () => {
        if (!Dispatcher) return;
        
        unpatch = before("dispatch", Dispatcher, (args) => {
            const event = args[0];
            if (!event) return;

            const currentUser = UserStore?.getCurrentUser?.();
            if (!currentUser) return;

            if (Array.isArray(event.messages)) {
                event.messages.forEach((msg: any) => {
                    if (Array.isArray(msg)) {
                        msg.forEach((m: any) => removeReactions(m, currentUser.id));
                    } else {
                        removeReactions(msg, currentUser.id);
                    }
                });
            }
            
            if (event.message) {
                removeReactions(event.message, currentUser.id);
            }
            
            if (event.type === "MESSAGE_REACTION_ADD" || event.type === "MESSAGE_REACTION_REMOVE") {
                if (event.userId !== currentUser.id) {
                    const targetMessage = MessageStore?.getMessage?.(event.channelId, event.messageId);
                    
                    if (targetMessage && targetMessage.author?.id === currentUser.id) {
                        args[0] = { type: "NEUTRALIZED_BY_PLUGIN" }; 
                    }
                }
            }
        });
    },
    
    onUnload: () => {
        if (unpatch) unpatch();
    }
};