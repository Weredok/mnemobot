function dependWord(word: string, length: number){
    console.log(length - word.length);
    return word + "ㅤ".repeat((length - word.length) - (length - word.length / 2) < 0 ? 0 : (length - word.length) - (length - word.length) / 2);
};

console.log(dependWord("частотность", 11) + ` |`);
console.log(dependWord("дата записи", 11) + ` |`)
console.log(dependWord("забытость", 11) + ` |`);
