import { EmbedBuilder, Webhook, WebhookClient } from "discord.js";
import { BaseEntity, Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Log extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @PrimaryColumn("text")
    message: string;

    @Column("text", { nullable: true })
    systemMessage: string;

    @Column("simple-json")
    author: {
        id: number,
        username: string,
        iconURL: string
    };

    @PrimaryColumn("text")
    type: "error" | "warning" | "info" | "success";

    @PrimaryColumn("numeric", { default: Date.now() })
    datestamp: number;

    async send(){
        const webhook = new WebhookClient({ "url": "https://discord.com/api/webhooks/1472539125847560335/Rswo969Ld3Egb7o3yggsHSIZ8za7kt4na3ecsLLh-cRgr25uWCwHBvvRHuc_GAUp4dsr" });

        const embeds = [
            new EmbedBuilder().setAuthor({ name: this?.author ? `${this?.author?.username} (${this?.author?.id})`: "Unknown", iconURL: this?.author?.iconURL, url: this?.author?.iconURL }).setDescription(`${this.message}\`\`\`json\n${this.systemMessage}\n\`\`\``).setColor("DarkButNotBlack").setTimestamp(this.datestamp)
        ];

        await webhook.send({ embeds });
    };
}

export { Log }