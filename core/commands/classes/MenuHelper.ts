import { Preferences, User } from "database";

export class MenuHelper {
  platform: "discord" | "telegram"
  user: User;
  preferences: Preferences;
  userDataInitialization?: {
    userId?: number;
    discordUserId?: string;
    telegramUserId?: number;
  };

  constructor(
    user: User,
    UDI?: { userId?: number; discordUserId?: string; telegramUserId?: number }, platform?: "discord" | "telegram"
  ) {
    this.user = user;
    this.userDataInitialization = UDI;
    this.platform = platform
  }

  async initialize() {
      this.user = await User.findOneBy({
        id: this.userDataInitialization.userId,
      });

      if(!this.user){
        console.error(`[database] (MenuHelper): User with id ${this.userDataInitialization.userId} not found. Request aborted.`)
      } else {
        this.preferences = await Preferences.findOneBy({ id: this.user.id });
      

      if(!this.platform){
        this.platform = this.preferences.platform
      }
    }
  }
}
