import { Dictionary } from "core";
import { Flashcard, Preferences, Session, User, Set} from "database";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";

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
            prediction = `Вы хорошо помните это слово, поскольку последнее повторение было <t:${Math.round(this.flashcard.lastReviewed / 1000)}:R>`
        } else if (this.flashcard.strength >= 0.7){
            prediction = `Чтобы вспомнить это слово вам придётся поднапрячься, поскольку последнее повторение было <t:${Math.round(this.flashcard.lastReviewed / 1000)}:R>`
        } else if (this.flashcard.strength >= 0.5){
            prediction = "Возможно, вы уже не помните это слово, если не встречали его где-либо или не делали особых ассоциаций с ним. Последнее повторение было <t:${Math.round(this.flashcard.lastReviewed / 1000)}:R>"
        } else {
            prediction = "Вероятнее всего это слово было вами забыто. Последнее повторение было <t:${Math.round(this.flashcard.lastReviewed / 1000)}:R>"
        }

        const embeds: EmbedBuilder[] = [
            new EmbedBuilder().setAuthor({ name: this.interaction.user.username, iconURL: this.interaction.user.displayAvatarURL() }).setTitle(`Повторение слов из словаря ${this.dictionary.language} (${this.dictionary.preferences.review.side}-side)`).setURL("https://discord.com").setFooter({ text: `Версия бота: ${process.env.version} ${this.flashcard.lastReviewed ? ` | Последний раз это слово было повторено` : ""}`, iconURL: this.interaction.client.user.displayAvatarURL() }).setTimestamp(this.flashcard.lastReviewed || new Date()).setDescription(`Помните ли вы перевод слова __**${this.flashcard[this.dictionary.preferences.review.side]}**__?\n\n*${prediction}*`)
        ];

        //(||${this.flashcard[this.dictionary.prefferences.review.side === "front" ? "back" : "front"]}||)?\n\n${this.dictionary.prefferences.review.answer}

        const components: ActionRowBuilder<ButtonBuilder>[] = [new ActionRowBuilder<ButtonBuilder>()];

        // Если режим ответа по кнопке включён
        if (this.dictionary.preferences.review.answer.type === "button") {
            components[0].addComponents(
                new ButtonBuilder().setCustomId(`review:known`).setLabel("Помню").setStyle(ButtonStyle.Primary),
            )
        };

        components[0].addComponents(
            new ButtonBuilder().setCustomId(`review:unknown`).setLabel("Не помню").setStyle(ButtonStyle.Secondary)
        );

        components[0].addComponents(
            new ButtonBuilder().setCustomId(`review:skip`).setLabel("Пропустить").setStyle(ButtonStyle.Secondary)
        );

        // Работа с автоматическим повторением и переключатели
        if (this.dictionary.preferences.review.auto.enabled) {

            components[0].addComponents(
                new ButtonBuilder().setCustomId(`review:manual`).setLabel("[Режим]: Ручной").setStyle(ButtonStyle.Success)

            )
        } else {
            components[0].addComponents(new ButtonBuilder().setCustomId(`review:auto`).setLabel("[Режим]: Авто").setStyle(ButtonStyle.Success)
            )
        };

        switch (this.dictionary.preferences.review.answer.type) {
            case "writting":
                components[0].addComponents(
                    new ButtonBuilder().setCustomId(`review:mode:writting`).setLabel("[Ответ]: Писать").setStyle(ButtonStyle.Success)
                );
                break;
            case "button":
                components[0].addComponents(
                    new ButtonBuilder().setCustomId(`review:mode:button`).setLabel("[Ответ]: По кнопке").setStyle(ButtonStyle.Success)
                )
                break;
            case "no":
                components[0].addComponents(
                    new ButtonBuilder().setCustomId(`review:mode:none`).setLabel("[Ответ]: Нету").setStyle(ButtonStyle.Success)
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
            new ButtonBuilder().setCustomId(`review:settings`).setLabel("Настройки").setStyle(ButtonStyle.Success)
        ));

        components[1].addComponents(
            new ButtonBuilder().setCustomId("review:side").setLabel(`Сторона: ${this.dictionary.preferences.review.side}`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("session:end").setLabel("Завершить сессию").setStyle(ButtonStyle.Danger)
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