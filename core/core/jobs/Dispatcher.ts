import { Notification, User, NotificationType } from "database";
import { LessThan, MoreThanOrEqual, And } from "typeorm";
import { ExpiryPolicy } from "database";


/**
 * Class about dispatched jobs like
 * 1. Everyday notification about review words and learn new
 * 2. Everyweek notification about suggestion for review words from week
 * 3. Everymonth notification about results
 * 4. Everyfriday notification about suggestion for generate set about suggested topics
 * 5. Everysaturday notification about suggestion for calibration settings
 * 6. Everysunday notification about suggestion for feedback
 * 7. Warnings about tech issues or planned maintenance
 * 8. News about new features
 */
export class Dispatcher {
    user: User;

    constructor(user: User) {
        this.user = user;
    }

    async planNextThreeHours(startTime: number, endTime: number) {
        await this.checkReviewNotifications(startTime, endTime);
        await this.checkWeeklyStats(startTime, endTime);
    }

    async checkReviewNotifications(start: number, end: number) {
        const hasWords = true; 

        if (hasWords) {
            const note = Notification.create({
                type: NotificationType.ReviewTime,
                data: {
                    userId: this.user.id,
                    message: "Time to review your words!",
                    datestamp: Date.now() + 1000 * 60 * 30, // через 30 минут
                    alwaysUpdate: false,
                    updatedNow: false,
                },
                expiryPolicy: ExpiryPolicy.Discard
            });
            await note.save();
        }
    }

    private async checkWeeklyStats(s: number, e: number) { /* Заглушка */ }
}