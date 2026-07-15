import { Flashcard, Preferences, User } from "database";

export class BaseSM2 {
  flashcardId: string;
  userId: number;
  preferencesId: number;

  flashcard: Flashcard;
  user: User;
  preferences: Preferences;

  data?: {
    language: { source: string; target: string };
  };

  constructor(flashcardId: string, userId: number, preferencesId: number) {
    this.flashcardId = flashcardId;
    this.userId = userId;
    this.preferencesId = preferencesId;
  }

  async syncronize() {
    this.flashcard = await Flashcard.findOneBy({ id: this.flashcardId });
    this.user = await User.findOneBy({ id: this.userId });
    this.preferences = await Preferences.findOneBy({ id: this.preferencesId });
  }

  async save() {
    this.flashcard.lastReviewed = Date.now();
    this.flashcard.intervalReviewCount++;

    await this.flashcard.save();
  };
}
