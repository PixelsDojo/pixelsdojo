const express = require('express');
const db = require('../database');
const router = express.Router();

// Chat endpoint - FREE VERSION (no API needed!)
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.json({ 
        success: false, 
        error: 'Please ask a question!' 
      });
    }

    // Search wiki for relevant content
    const wikiContext = await searchWikiContent(question);
    
    // Generate helpful response based on search results
    const response = generateSearchResponse(question, wikiContext);
    
    res.json({
      success: true,
      answer: response.text,
      citations: response.citations
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.json({
      success: false,
      error: 'Sorry, I encountered an error. Please try again!'
    });
  }
});

// Search wiki database for relevant content
async function searchWikiContent(question) {
  return new Promise((resolve, reject) => {
    const searchTerms = question.toLowerCase().split(' ').filter(w => w.length > 3);
    const searchPattern = `%${searchTerms.join('%')}%`;
    
    const query = `
      SELECT id, title, slug, content, category, 
             (CASE 
               WHEN LOWER(title) LIKE ? THEN 3
               WHEN LOWER(content) LIKE ? THEN 2
               ELSE 1
             END) as relevance
      FROM pages 
      WHERE (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)
      ORDER BY relevance DESC, id DESC
      LIMIT 5
    `;
    
    db.all(query, [searchPattern, searchPattern, searchPattern, searchPattern], (err, pages) => {
      if (err) {
        console.error('Search error:', err);
        resolve([]);
      } else {
        resolve(pages || []);
      }
    });
  });
}

// Generate helpful response based on search results (NO AI NEEDED!)
function generateSearchResponse(question, wikiContext) {
  const citations = [];
  let responseText = '';
  
  if (wikiContext && wikiContext.length > 0) {
    // Build a helpful response from wiki content
    responseText = `I found ${wikiContext.length} guide${wikiContext.length > 1 ? 's' : ''} that might help answer your question:\n\n`;
    
    wikiContext.forEach((page, index) => {
      // Extract a relevant excerpt
      const excerpt = extractRelevantExcerpt(question, page.content);
      
      responseText += `**${page.title}**\n`;
      responseText += `${excerpt}\n`;
      responseText += `📖 Category: ${page.category || 'General'}\n\n`;
      
      citations.push({
        title: page.title,
        slug: page.slug,
        category: page.category
      });
    });
    
    responseText += `Click any guide below to read the full article! 📚`;
    
  } else {
    // No results found - provide helpful guidance
    responseText = generateNoResultsResponse(question);
  }
  
  return {
    text: responseText,
    citations: citations
  };
}

// Extract relevant excerpt from page content
function extractRelevantExcerpt(question, content) {
  const questionWords = question.toLowerCase().split(' ').filter(w => w.length > 3);
  
  // Try to find a sentence containing question keywords
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  for (let sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (questionWords.some(word => lowerSentence.includes(word))) {
      // Found relevant sentence, return it with context
      return sentence.trim().substring(0, 200) + '...';
    }
  }
  
  // Fallback: return first 200 chars
  return content.substring(0, 200).trim() + '...';
}

// Generate helpful response when no results found
function generateNoResultsResponse(question) {
  const lowerQuestion = question.toLowerCase();
  
  // Check what they're asking about and provide guidance
  if (lowerQuestion.includes('earn') || lowerQuestion.includes('pixel') || lowerQuestion.includes('money')) {
    return `I couldn't find a specific guide for that question, but here's what I know:\n\n**To earn $PIXEL tokens**, you can:\n\n• **Complete Task Board orders** (primary method)\n• **Participate in Hearth Hall** (faction competitions)\n• **Play Neon Zone arcade games** (ranked competitions)\n• **Stake your $PIXEL** (passive income)\n• **Create and sell UGCs** (advanced)\n\nCheck out the "Earn $PIXEL" category for detailed guides! 💰`;
  }
  
  if (lowerQuestion.includes('npc') || lowerQuestion.includes('where') || lowerQuestion.includes('find')) {
    return `I couldn't find a specific guide for that NPC or location, but here's how to navigate TerraVilla:\n\n• Visit the **NPC Directory** to see all NPCs and their locations\n• Use the **Map Guide** for detailed TerraVilla layout\n• Check the **Getting Started** guide for beginner orientation\n\nMost NPCs are in the main fountain square area! 🗺️`;
  }
  
  if (lowerQuestion.includes('start') || lowerQuestion.includes('begin') || lowerQuestion.includes('new')) {
    return `Welcome to Pixels Online! Here's how to get started:\n\n• Complete the **tutorial quests** with Barney, Margaret, and Jack\n• Set up your **house** (access task board there)\n• Start doing **simple task board orders** to earn coins and $PIXEL\n• Explore **TerraVilla** and meet NPCs\n\nCheck out the "Start Here" category for beginner guides! 🌱`;
  }
  
  if (lowerQuestion.includes('vip') || lowerQuestion.includes('membership')) {
    return `VIP membership gives you awesome perks:\n\n• **Infinifunnel** - Access task board from anywhere (HUGE time saver!)\n• **Sauna access** - 1000 energy 2-3 times daily\n• **Priority support** from Pixels team\n• **Exclusive areas** and benefits\n\nVIP costs $PIXEL but pays for itself in time savings! Check the Mastery category for more details. ⭐`;
  }
  
  // Generic helpful response
  return `I couldn't find a specific guide for that question yet, but here's how to find what you need:\n\n• Browse the **category pages** (Start Here, Earn $PIXEL, Mastery)\n• Check the **NPC Directory** for character locations\n• Look at **recent guides** on the homepage\n\nOr try asking your question a different way! I'm still learning. 🤖\n\nWant to contribute a guide on this topic? We'd love your help! 💜`;
}

module.exports = router;
