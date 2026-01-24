import { Flashcard, Preferences, User } from "database";
import { BaseSM2 } from "./Base.ts";

export class StaticSM2 extends BaseSM2 {
    constructor(flashcardId: string, userId: number, preferencesId: number) {
        super(flashcardId, userId, preferencesId);
    };

    async syncronize() {
        this.flashcard = await Flashcard.findOneBy({ id: this.flashcardId });
        this.user = await User.findOneBy({ id: this.userId });
        this.preferences = await Preferences.findOneBy({ id: this.preferencesId });
    };

    async qualityCheck(startTime: number, endTime: number, correct: boolean){
        let quality = 0;
        quality = Number(correct) * 0
    }

}