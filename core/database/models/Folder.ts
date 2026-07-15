import { BaseEntity, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Folder extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @PrimaryColumn("text")
    name: string;

    @PrimaryColumn("numeric")
    user: number;

    @PrimaryColumn("text")
    language: string;

    @PrimaryColumn("simple-array")
    sets: string[]
};

export { Folder }