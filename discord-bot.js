const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

// Bot Configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SERVER_ID = '1092464767760867491';
const RULES_CHANNEL_ID = '1440049632658063461';
const ANNOUNCEMENTS_CHANNEL_ID = '1472611371144450149';
const BLADE_ROLE_NAME = 'Blade'; // Role to give after verification

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// Bot ready event
client.once('ready', async () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
  
  // Set bot status
  client.user.setActivity('Pixels Dojo Wiki', { type: 'WATCHING' });
  
  // Send verification message to rules channel (only once)
  try {
    const rulesChannel = await client.channels.fetch(RULES_CHANNEL_ID);
    
    // Check if verification message already exists
    const messages = await rulesChannel.messages.fetch({ limit: 10 });
    const hasVerification = messages.some(msg => 
      msg.author.id === client.user.id && msg.embeds.length > 0
    );
    
    if (!hasVerification) {
      const verifyEmbed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('✅ Verify to Access Server')
        .setDescription(
          'Welcome to **Pixels Dojo**! 🎮\n\n' +
          'By clicking the button below, you confirm that:\n' +
          '• You have read and agree to follow the rules above\n' +
          '• You will be respectful to all community members\n' +
          '• You understand this is a family-friendly server\n\n' +
          'Click **Verify** to unlock all channels!'
        )
        .setFooter({ text: 'Pixels Dojo • Making Pixels easier for everyone' })
        .setTimestamp();
      
      const verifyButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify')
            .setLabel('✅ I Accept - Verify Me')
            .setStyle(ButtonStyle.Success)
        );
      
      await rulesChannel.send({ 
        embeds: [verifyEmbed], 
        components: [verifyButton] 
      });
      
      console.log('📜 Verification message posted to rules channel');
    }
  } catch (error) {
    console.error('Error setting up verification:', error);
  }
});

// Handle button interactions (verification)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  if (interaction.customId === 'verify') {
    try {
      const member = interaction.member;
      const guild = interaction.guild;
      
      // Find Blade role
      const bladeRole = guild.roles.cache.find(role => role.name === BLADE_ROLE_NAME);
      
      if (!bladeRole) {
        return interaction.reply({ 
          content: '❌ Error: Blade role not found. Please contact an admin.', 
          ephemeral: true 
        });
      }
      
      // Check if already verified
      if (member.roles.cache.has(bladeRole.id)) {
        return interaction.reply({ 
          content: '✅ You are already verified!', 
          ephemeral: true 
        });
      }
      
      // Give Blade role
      await member.roles.add(bladeRole);
      
      // Send success message
      await interaction.reply({ 
        content: '✅ **Verified!** Welcome to Pixels Dojo, Blade! You now have access to all channels. 🎮', 
        ephemeral: true 
      });
      
      console.log(`✅ Verified user: ${member.user.tag}`);
      
    } catch (error) {
      console.error('Error verifying user:', error);
      await interaction.reply({ 
        content: '❌ Error verifying. Please contact an admin.', 
        ephemeral: true 
      });
    }
  }
});

// Handle messages (Q&A system)
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check for !ask command
  if (message.content.toLowerCase().startsWith('!ask')) {
    const question = message.content.slice(4).trim();
    
    if (!question) {
      return message.reply('❓ Please ask a question! Example: `!ask how do I farm?`');
    }
    
    try {
      // Search wiki database
      const results = await searchWiki(question);
      
      if (results.length === 0) {
        return message.reply(
          '🤔 I couldn\'t find any guides about that. Try:\n' +
          '• Check our wiki: https://pixelsdojo-production.up.railway.app\n' +
          '• Browse all guides: https://pixelsdojo-production.up.railway.app/all-posts\n' +
          '• Ask in the community - someone might know!'
        );
      }
      
      // Create embed with results
      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle(`📚 Found ${results.length} Guide${results.length > 1 ? 's' : ''}`)
        .setDescription(`Here's what I found about "${question}":`)
        .setFooter({ text: 'Click links to read full guides' })
        .setTimestamp();
      
      results.forEach((page, index) => {
        const excerpt = page.content
          .replace(/<[^>]*>/g, '')
          .substring(0, 100) + '...';
        
        embed.addFields({
          name: `${index + 1}. ${page.title}`,
          value: `${excerpt}\n[Read Guide](https://pixelsdojo-production.up.railway.app/pages/${page.slug})`,
          inline: false
        });
      });
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error searching wiki:', error);
      message.reply('❌ Error searching wiki. Please try again later!');
    }
  }
  
  // Check for !help command
  if (message.content.toLowerCase() === '!help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#EDFF84')
      .setTitle('🤖 Pixels Dojo Bot Commands')
      .setDescription('Here\'s what I can do:')
      .addFields(
        { name: '!ask [question]', value: 'Ask me anything about Pixels! I\'ll search the wiki for answers.', inline: false },
        { name: '!help', value: 'Show this help message', inline: false },
        { name: 'Auto-Announcements', value: 'I automatically post new wiki guides to #announcements!', inline: false }
      )
      .setFooter({ text: 'Pixels Dojo Bot • Built with ❤️' })
      .setTimestamp();
    
    await message.reply({ embeds: [helpEmbed] });
  }
});

// Search wiki function
function searchWiki(question) {
  return new Promise((resolve, reject) => {
    const searchTerms = question.toLowerCase().split(' ').filter(w => w.length > 3);
    const searchPattern = `%${searchTerms.join('%')}%`;
    
    const query = `
      SELECT id, title, slug, content, category
      FROM pages 
      WHERE (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)
      ORDER BY 
        CASE 
          WHEN LOWER(title) LIKE ? THEN 3
          WHEN LOWER(content) LIKE ? THEN 2
          ELSE 1
        END DESC
      LIMIT 3
    `;
    
    db.all(query, [searchPattern, searchPattern, searchPattern, searchPattern], (err, pages) => {
      if (err) {
        console.error('Wiki search error:', err);
        resolve([]);
      } else {
        resolve(pages || []);
      }
    });
  });
}

// Function to announce new wiki article (call this from your server.js)
async function announceNewArticle(articleData) {
  try {
    const channel = await client.channels.fetch(ANNOUNCEMENTS_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('📚 New Guide Published!')
      .setDescription(`**${articleData.title}**`)
      .addFields(
        { name: '📖 Category', value: articleData.category || 'General', inline: true },
        { name: '⚡ Difficulty', value: articleData.difficulty || 'Beginner', inline: true },
        { name: '✍️ Author', value: articleData.author || 'Pixels Dojo', inline: true }
      )
      .setURL(`https://pixelsdojo-production.up.railway.app/pages/${articleData.slug}`)
      .setFooter({ text: 'Click the title to read the full guide!' })
      .setTimestamp();
    
    if (articleData.summary) {
      embed.setDescription(`**${articleData.title}**\n\n${articleData.summary.substring(0, 150)}...`);
    }
    
    await channel.send({ embeds: [embed] });
    console.log(`📢 Announced new article: ${articleData.title}`);
    
  } catch (error) {
    console.error('Error announcing article:', error);
  }
}

// Handle errors
client.on('error', (error) => {
  console.error('Discord bot error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Start bot
client.login(DISCORD_TOKEN)
  .then(() => console.log('🤖 Discord bot starting...'))
  .catch(err => console.error('Failed to login:', err));

// Export for use in server.js
module.exports = {
  client,
  announceNewArticle
};
