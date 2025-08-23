import { BaseEntity, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Log extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @PrimaryColumn("text")
    message: string;

    @PrimaryColumn("text")
    type: "error" | "warning" | "info" | "success";

    @PrimaryColumn("numeric")
    datestamp: number;
}

export { Log }