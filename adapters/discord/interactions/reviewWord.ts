import { Dictionary } from "core";
import { Flashcard, Preferences, Session, User, Set} from "database";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { text } from "../../../core/languages/index.ts";

export class reviewWord {
    flashcard: Flashcard;
    session: Session;
    set: Set;
    dictionary: Dictionary;
    interaction: ButtonInteraction;

    constructor(flashcard: Flashcard, session: Session, dictionary: Dictionary, user: User, interaction: ButtonInteraction) {
        this.dictionary = dictionary;
        this.dictionary.user = user;
        this.flashcard = flashcard;
        this.session = session;
        this.interaction = interaction;
    };

    async initialize() {
        await this.session.start(this.dictionary.user.id, this.dictionary.sets.map(set => set.id));
        await this.dictionary.syncronize()
        return this;
    };

    async next() {
        this.flashcard = await this.session.next();
        return this;
    }

    async qualify(){
        return this;
    }

    generate() {
        this.set = this.dictionary.sets.find(set => set.id === this.flashcard.set);
        let prediction: string;
        if(this.flashcard.strength >= 0.85){
            prediction = `${text("review_word.predictions.85", this.dictionary.language.target)} <t:${Math.round(this.flashcard.lastReviewed / 1000)}:R>`
        } else if (this.flashcard.strength >= 0.7){
            prediction = `${text("review_word.predictions.70", this.dictionary.language.target)} <t:${Math.round(this.flashcard.lastReviewed / 1000)}:R>`
        } else if (this.flashcard.strength >= 0.5){
            prediction = `${text("review_word.predictions.50", this.dictionary.language.target)} <t:${Math.round(this.flashcard.lastReviewed / 1000)}:R>`
        } else {
            prediction = `${text("review_word.predictions.default", this.dictionary.language.target)} <t:${Math.round(this.flashcard.lastReviewed / 1000)}:R>`
        }

        const embeds: EmbedBuilder[] = [
            new EmbedBuilder().setAuthor({ name: this.interaction.user.username, iconURL: this.interaction.user.displayAvatarURL() }).setTitle(`${text("review_word.title", this.dictionary.language.target)} ${this.dictionary.language} (${this.dictionary.preferences.review.side}-side)`).setURL("https://discord.com").setFooter({ text: `${text("main_menu.bot_version", this.dictionary.language.target)} ${process.env.version} ${this.flashcard.lastReviewed ? ` | ${text("review_word.last_review", this.dictionary.language.target)}` : ""}`, iconURL: this.interaction.client.user.displayAvatarURL() }).setTimestamp(this.flashcard.lastReviewed || new Date()).setDescription(`${text("review_word.did_you", this.dictionary.language.target)} __**${this.flashcard[this.dictionary.preferences.review.side]}**__?\n\n*${prediction}*`)
        ];

        //(||${this.flashcard[this.dictionary.prefferences.review.side === "front" ? "back" : "front"]}||)?\n\n${this.dictionary.prefferences.review.answer}

        const components: ActionRowBuilder<ButtonBuilder>[] = [new ActionRowBuilder<ButtonBuilder>()];

        // Если режим ответа по кнопке включён
        if (this.dictionary.preferences.review.answer.type === "button") {
            components[0].addComponents(
                new ButtonBuilder().setCustomId(`review:known`).setLabel(text("review_word.known", this.dictionary.language.target)).setStyle(ButtonStyle.Primary),
            )
        };

        components[0].addComponents(
            new ButtonBuilder().setCustomId(`review:unknown`).setLabel(text("review_word.knownt", this.dictionary.language.target)).setStyle(ButtonStyle.Secondary)
        );

        components[0].addComponents(
            new ButtonBuilder().setCustomId(`review:skip`).setLabel(text("review_word.skip", this.dictionary.language.target)).setStyle(ButtonStyle.Secondary)
        );

        // Работа с автоматическим повторением и переключатели
        if (this.dictionary.preferences.review.auto.enabled) {

            components[0].addComponents(
                new ButtonBuilder().setCustomId(`review:manual`).setLabel(`[${text("review_word.mode", this.dictionary.language.target)}]: ${text("review_word.modes.manual", this.dictionary.language.target)}`).setStyle(ButtonStyle.Success)

            )
        } else {
            components[0].addComponents(new ButtonBuilder().setCustomId(`review:auto`).setLabel(`[${text("review_word.mode", this.dictionary.language.target)}]: ${text("review_word.modes.auto", this.dictionary.language.target)}`).setStyle(ButtonStyle.Success)            )
        };

        switch (this.dictionary.preferences.review.answer.type) {
            case "writting":
                components[0].addComponents(
                    new ButtonBuilder().setCustomId(`review:mode:writting`).setLabel(`[${text("review_word.answer", this.dictionary.language.target)}]: ${text("review_word.answers.writting", this.dictionary.language.target)}`).setStyle(ButtonStyle.Success)
                );
                break;
            case "button":
                components[0].addComponents(
                    new ButtonBuilder().setCustomId(`review:mode:button`).setLabel(`[${text("review_word.answer", this.dictionary.language.target)}]: ${text("review_word.answers.button", this.dictionary.language.target)}`).setStyle(ButtonStyle.Success)
                )
                break;
            case "no":
                components[0].addComponents(
                    new ButtonBuilder().setCustomId(`review:mode:none`).setLabel(`[${text("review_word.answers", this.dictionary.language.target)}]: $text("review_word.answers.none, this.dictionary.language.target)}`).setStyle(ButtonStyle.Success)
                );
                break;
        };

        /**
         * Доступные настройки в модальном окне будут такие:
         * 1. Ответ (МО: время автоудаления), автоудаление
         * 2. Авто (МО: время ожидания), сторона откладывания
         * 3. SM-2 (МО: множитель), режим 
         */
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`review:settings`).setLabel(text("buttons_reference.settings", this.dictionary.language.target)).setStyle(ButtonStyle.Success)
        ));

        components[1].addComponents(
            new ButtonBuilder().setCustomId("review:side").setLabel(`${text("review_word.side", this.dictionary.language.target)} ${this.dictionary.preferences.review.side}`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("session:end").setLabel(text("review_word.end_session", this.dictionary.language.target)).setStyle(ButtonStyle.Danger)
        )

        return { embeds, components }
    }

    async go() {
        const message = await this.interaction.editReply(this.generate());
        const collector = message.createMessageComponentCollector({ time: this.dictionary.preferences.review.auto.enabled ? this.dictionary.preferences.review.auto.interval : this.dictionary.preferences.idleTimeout, componentType: ComponentType.Button });

        collector.on("collect", async (interaction) => {
            await this.handler(interaction.customId.split(":")[0], interaction.customId.split(":")[1], interaction.customId.split(":")[2]);
        })
    };

    async handler(command: string, fn: string, payoload?: string) {
        
    }
}