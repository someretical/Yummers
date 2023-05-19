import { User as PrismaUser } from '@prisma/client';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { DateTime, FixedOffsetZone } from 'luxon';
import BirthdayClient from '../structures/BirthdayClient';
import Command from '../structures/Command';
import { DatabaseErrorType, databaseError } from '../util/Database';
import { getEmbed } from '../util/EmbedHelper';

export default class Birthday extends Command {
    constructor(client: BirthdayClient) {
        super({
            client: client,
            builder: new SlashCommandBuilder()
                .setName('birthday')
                .setDescription('All about birthdays')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('set')
                        .setDescription('Set your birthday')
                        .addStringOption((option) =>
                            option
                                .setName('month')
                                .setDescription('The month of your birthday')
                                .setRequired(true)
                                .setChoices(
                                    { name: 'January', value: '1' },
                                    { name: 'February', value: '2' },
                                    { name: 'March', value: '3' },
                                    { name: 'April', value: '4' },
                                    { name: 'May', value: '5' },
                                    { name: 'June', value: '6' },
                                    { name: 'July', value: '7' },
                                    { name: 'August', value: '8' },
                                    { name: 'September', value: '9' },
                                    { name: 'October', value: '10' },
                                    { name: 'November', value: '11' },
                                    { name: 'December', value: '12' }
                                )
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('day')
                                .setDescription('The day of your birthday')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(31)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('utchouroffset')
                                .setDescription('UTC hour offset')
                                .setMinValue(-11)
                                .setMaxValue(11)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('utcminoffset')
                                .setDescription('UTC minute offset')
                                .setMinValue(0)
                                .setMaxValue(59)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('get')
                        .setDescription('Retrieve a birthday')
                        .addUserOption((option) =>
                            option.setName('user').setDescription('The user to get the birthday of')
                        )
                )
        });
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        switch (interaction.options.getSubcommand()) {
            case 'set': {
                const month = interaction.options.getString('month') as string;
                const day = interaction.options.getInteger('day') as number;
                const hourOffset = interaction.options.getInteger('utchouroffset') ?? 0;
                const minuteOffset = interaction.options.getInteger('utcminoffset') ?? 0;
                const offset = FixedOffsetZone.instance(hourOffset * 60 + minuteOffset);
                const birthday = DateTime.fromObject(
                    { year: 2000, month: parseInt(month), day: day },
                    { zone: offset }
                );

                if (!birthday.isValid) {
                    interaction.reply({
                        embeds: [getEmbed().setDescription('Please provide a valid date!')]
                    });
                    return;
                }

                const utcBirthday = birthday.toUTC();

                try {
                    await this.client.prisma.user.upsert({
                        where: { id: interaction.user.id },
                        update: {
                            birthday_start_month: utcBirthday.month,
                            birthday_start_day: utcBirthday.day,
                            birthday_start_hour: utcBirthday.hour,
                            birthday_start_minute: utcBirthday.minute,
                            birthday_utc_offset: offset.offset(0)
                        },
                        create: {
                            id: interaction.user.id,
                            birthday_start_month: utcBirthday.month,
                            birthday_start_day: utcBirthday.day,
                            birthday_start_hour: utcBirthday.hour,
                            birthday_start_minute: utcBirthday.minute,
                            birthday_utc_offset: offset.offset(0)
                        }
                    });
                } catch (err) {
                    return databaseError(err, DatabaseErrorType.Write, interaction);
                }

                interaction.reply({
                    embeds: [
                        getEmbed().setDescription(
                            `Your birthday has been set to ${birthday.toFormat("LLLL d ('UTC' ZZ)")}`
                        )
                    ]
                });

                break;
            }

            case 'get': {
                const user = interaction.options.getUser('user') ?? interaction.user;

                let userData: PrismaUser | null = null;
                try {
                    userData = await this.client.prisma.user.findUnique({
                        where: { id: user.id }
                    });
                } catch (err) {
                    return databaseError(err, DatabaseErrorType.Read, interaction);
                }

                if (!userData) {
                    interaction.reply({
                        embeds: [getEmbed().setDescription('This user has not set their birthday!')]
                    });
                    return;
                }

                const offset = FixedOffsetZone.instance(userData.birthday_utc_offset);

                let birthday = DateTime.fromObject(
                    {
                        year: 2000,
                        month: userData.birthday_start_month,
                        day: userData.birthday_start_day,
                        hour: userData.birthday_start_hour,
                        minute: userData.birthday_start_minute
                    },
                    { zone: offset }
                );
                birthday = birthday.plus({ minutes: offset.offset(0) });

                interaction.reply({
                    embeds: [
                        getEmbed()
                            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                            .addFields([
                                {
                                    name: 'Birthday',
                                    value: birthday.toFormat("LLLL d ('UTC' ZZ)")
                                },
                                {
                                    name: 'Messages',
                                    value: userData.accept_birthday_messages ? 'Enabled' : 'Disabled'
                                }
                            ])
                    ]
                });

                break;
            }
        }
    }
}
