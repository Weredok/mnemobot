import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany } from "typeorm";

@Entity()
export class Set extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    // Уникальный айди этого сета
    id: string;

    @Column("text", { nullable: false })
    // Название сета
    name: string;

    @Column("numeric")
    user: number;

    @Column("numeric", { default: Date.now() })
    // Время создания сета
    createdAt: number;

    @Column("numeric", { default: Date.now() })
    // Время последнего обновления сета
    updatedAt: number;

    @Column("text", { nullable: true })
    folder: string;

    // Карточки, принадлежащие этому сету
    @Column("simple-array")
    flashcards: string[]
}

