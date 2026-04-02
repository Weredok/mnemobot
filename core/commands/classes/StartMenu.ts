import { text } from "../../languages/index.ts";
import { MenuHelper } from "./MenuHelper.ts";

export enum Location {
  Home = "main_menu.home",

  Settings = "main_menu.settings.title",
  ChangeUserInfo = "main_menu.settings.change_user_info",
  Preferences = "main_menu.settings.preferences",
  Quotes = "main_menu.settings.quotes",

  Dictionary = "main_menu.dictionary.title",
  ChangingKnowingLanguages = "main_menu.dictionary.change_knowing_languages",
  AddingNewLanguage = "main_menu.dictionary.add_new_language",
  ReadingAboutInteractionBot = "main_menu.dictionary.read_about_interaction_bot",

  History = "buttons_reference.history",

  Feedback = "buttons_reference.feedback",
  Spawn = "buttons_reference.spawn",

  Registration = "registration.title",
  RegistrationPreferences = "registration.pref_settings",

  CreateFolder = "create_folder.title",
  CreateSet = "create_set.title",
  CreateWord = "create_word.title",
  ReviewWord = "review_word.title",
}

export class StartMenu extends MenuHelper {
  current_location: Location;
  previous_location: Location;
  featured_location: Location;

  constructor() {
    super();
    this.current_location = Location.Home;
    this.previous_location = Location.Home;
    this.featured_location = Location.Home;
  }

  async build() {
    await super.initialize();

    // Featuring next location
    switch (this.current_location) {
      case Location.Home:
        this.featured_location = Location.Feedback;
        break;
      case Location.Settings:
        this.featured_location = Location.Preferences;
        break;
      case Location.Dictionary:
        this.featured_location = Location.AddingNewLanguage;
        break;
    };

    

    
  }
}
