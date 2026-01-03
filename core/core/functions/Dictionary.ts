import { Flashcard, Folder, Preferences, Set, User } from "database";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

interface DictionaryFilters {
  // Частотность слова по общим кол-вам повторения
  frequency?: boolean;
  // Дата создания слова
  dateOfCreation?: boolean;
  // Длина слова
  length?: boolean;
  // Забытость слова
  forgotten?: boolean;
  // Два или больше синонима к одному слову
  polysemitic?: boolean;
}

export class Dictionary {
  userId: number;
  folderIds: string[];
  setIds: string[];
  flashcardIds: string[];
  language: { source?: string; target?: string; name?: string };
  folders: Folder[];
  sets: Set[];
  flashcards: Flashcard[];
  user: User;
  preferences: Preferences;

  constructor({
    userId,
    folderIds,
    setIds,
    flashcardIds,
    language,
    folders,
    sets,
    flashcards,
    user,
    preferences,
  }) {
    this.userId = userId;
    this.folderIds = folderIds;
    this.setIds = setIds;
    this.flashcardIds = flashcardIds;
    this.language = language;
    this.folders = folders;
    this.sets = sets;
    this.flashcards = flashcards;
    this.user = user;
    this.preferences = preferences;
  }

  async syncronize(reverse?: boolean) {
    if (reverse) {
      await Promise.all(
        [
          this.user,
          ...this.folders,
          ...this.sets,
          ...this.flashcards,
          this.preferences,
        ].map(async (obj) => (obj ? await obj?.save() : null))
      );

      this.folderIds = this.folders.map((folder) => folder.id);
      this.setIds = this.sets.map((set) => set.id);
      this.flashcardIds = this.flashcards.map((flashcard) => flashcard.id);
      return;
    } else {
      this.user = await User.findOneBy({ id: this.userId });
      this.folders = await Folder.findBy({
        user: this.user.id,
        language: this.language.source,
      });
      this.folderIds = this.folders.map((folder) => folder.id);
      this.sets = await Set.findBy({
        folder: this.folders.map((folder) => folder.id)[0],
      });
      this.setIds = this.sets.map((set) => set.id);
      this.flashcards = await Flashcard.findBy({
        set: this.sets.map((set) => set.id)[0],
      });
      this.flashcardIds = this.flashcards.map((flashcard) => flashcard.id);
      this.preferences =
        (await Preferences.findOneBy({ id: this.user.id })) ??
        (await new Preferences().init(this.user));
    }

    return this;
  }

  async addFolder(name: string) {
    const newFolder = new Folder();
    newFolder.name = name;
    newFolder.user = this.user.id;
    newFolder.language = this.language.source;
    newFolder.sets = [];
    await newFolder.save();
    this.folders.push(newFolder);
    await this.syncronize(true);
  }

  async addSet(name: string) {
    const newSet = new Set();
    newSet.name = name;
    newSet.user = this.user.id;
    newSet.flashcards = [];
    await newSet.save();
    this.sets.push(newSet);
    await this.syncronize(true);
  }

  async addWord(
    front: string[],
    back: string[],
    set: string,
    quality: number[] = [5]
  ) {
    const newFlashcard = new Flashcard();
    newFlashcard.front = front;
    newFlashcard.back = back;
    newFlashcard.set = set;
    newFlashcard.user = this.user.id;
    newFlashcard.quality = quality;
    newFlashcard.reviewCount = 0;
    await newFlashcard.save();
    this.flashcards.push(newFlashcard);
    this.sets
      .find((set) => set.id === newFlashcard.set)
      .flashcards.push(newFlashcard.id);
    await this.syncronize(true);
  }

  buildButtonsUtil() {
    const components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("frequency:")
          .setLabel("Частотность")
          .setStyle(
            this.preferences.dictionaryFilters.frequency === undefined
              ? ButtonStyle.Secondary
              : this.preferences.dictionaryFilters.frequency
                ? ButtonStyle.Primary
                : ButtonStyle.Danger
          ),
        new ButtonBuilder()
          .setCustomId("dateOfCreation:")
          .setLabel("Дата записи")
          .setStyle(
            this.preferences.dictionaryFilters.dateOfCreation === undefined
              ? ButtonStyle.Secondary
              : this.preferences.dictionaryFilters.dateOfCreation
                ? ButtonStyle.Primary
                : ButtonStyle.Danger
          ),
        new ButtonBuilder()
          .setCustomId("length:")
          .setLabel("Длина слова")
          .setStyle(
            this.preferences.dictionaryFilters.length === undefined
              ? ButtonStyle.Secondary
              : this.preferences.dictionaryFilters.length
                ? ButtonStyle.Primary
                : ButtonStyle.Danger
          ),
        new ButtonBuilder()
          .setCustomId("forgotten:")
          .setLabel("Забытость")
          .setStyle(
            this.preferences.dictionaryFilters.forgotten === undefined
              ? ButtonStyle.Secondary
              : this.preferences.dictionaryFilters.forgotten
                ? ButtonStyle.Primary
                : ButtonStyle.Danger
          ),
        new ButtonBuilder()
          .setCustomId("polysemitic:")
          .setLabel("Многозначность")
          .setStyle(
            this.preferences.dictionaryFilters.polysemitic === undefined
              ? ButtonStyle.Secondary
              : this.preferences.dictionaryFilters.polysemitic
                ? ButtonStyle.Primary
                : ButtonStyle.Danger
          )
      ),

      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("dictionary:")
          .setStyle(ButtonStyle.Success)
          .setDisabled(false)
          .setLabel("Вернуться обратно в словарь")
      ),
    ];

    return components;
  }
}

export { type DictionaryFilters };
