import { entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Client, CommandInteraction, GuildMember, Snowflake } from 'discord.js';
import { createListeningStream } from './createListeningStream';

async function join(
	interaction: CommandInteraction,
	client: Client,
	connection?: VoiceConnection,
) {
	await interaction.deferReply();
	if (!connection) {
		if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
			const channel = interaction.member.voice.channel;
			connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				selfDeaf: false,
				selfMute: true,
				adapterCreator: channel.guild.voiceAdapterCreator,
			});
		} else {
			await interaction.followUp('Join a voice channel and then try that again!');
			return;
		}
	}

	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 20e3);

		const receiver = connection.receiver;

		if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
			console.error('interaction called by ethereal member 👻 or no voice channel joined')
			return
		}
		const members = interaction.member.voice.channel.members.filter(member => member.id !== client.user?.id);

		members.forEach(member => {
			createListeningStream(receiver, member.id, client.users.cache.get(member.id));
		})
	} catch (error) {
		console.warn(error);
		await interaction.followUp('Failed to join voice channel within 20 seconds, please try again later!');
	}

	await interaction.followUp('Ready!');
}

async function follow(
	interaction: CommandInteraction,
	client: Client,
	connection?: VoiceConnection,
) {
	if (connection) {
		const userId = interaction.options.get('speaker')!.value! as Snowflake;

		const receiver = connection.receiver;
		if (connection.receiver.speaking.users.has(userId)) {
			createListeningStream(receiver, userId, client.users.cache.get(userId));
		}

		await interaction.reply({ ephemeral: true, content: 'Listening!' });
	} else {
		await interaction.reply({ ephemeral: true, content: 'Join a voice channel and then try that again!' });
	}
}

async function leave(
	interaction: CommandInteraction,
	_client: Client,
	connection?: VoiceConnection,
) {
	if (connection) {
		connection.destroy();
		await interaction.reply({ ephemeral: true, content: 'Left the channel!' });
	} else {
		await interaction.reply({ ephemeral: true, content: 'Not playing in this server!' });
	}
}

export const interactionHandlers = new Map<
	string,
	(
		interaction: CommandInteraction,
		client: Client,
		connection?: VoiceConnection,
	) => Promise<void>
>();
interactionHandlers.set('join', join);
interactionHandlers.set('follow', follow);
interactionHandlers.set('leave', leave);
