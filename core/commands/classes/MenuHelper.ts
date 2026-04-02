import { User } from "database";

export class MenuHelper {
  user: User;
  userDataInitialization?: {
    userId?: number;
    discordUserId?: string;
    telegramUserId?: string;
  };

  constructor(
    user?: User,
    UDI?: { userId?: number; discordUserId?: string; telegramUserId?: string },
  ) {
    this.user = user;
    this.userDataInitialization = UDI;
  }

  async initialize() {
      this.user = await User.findOneBy({
        id: this.userDataInitialization.userId,
      });
    
  }
}
