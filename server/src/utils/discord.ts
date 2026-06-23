

export const sendDiscordNotification = async (embed: any) => {
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!discordWebhookUrl) return;

  try {
    const message = {
      content: null,
      embeds: [embed]
    };

    await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (err) {
    console.error('Failed to send Discord notification:', err);
  }
};
