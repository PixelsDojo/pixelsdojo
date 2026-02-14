const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../database');
const router = express.Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Chat endpoint
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
    
    // Build context for Claude
    const systemPrompt = buildSystemPrompt(wikiContext);
    
    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: question
      }]
    });
    
    // Extract response
    const answer = message.content[0].text;
    
    // Format response with citations
    const formattedResponse = formatResponseWithCitations(answer, wikiContext);
    
    res.json({
      success: true,
      answer: formattedResponse.text,
      citations: formattedResponse.citations
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.json({
      success: false,
      error: 'Sorry, I encountered an error. Please try again!'
    });
  }
});

// Search wiki database for relevant content (FIXED - removed status column)
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

// Build system prompt with wiki context
function buildSystemPrompt(wikiContext) {
  let prompt = `You are the Pixels Dojo Wiki Assistant, an AI helper for Pixels Online players.

Your purpose is to help players by answering questions about Pixels Online gameplay, earning $PIXEL, game mechanics, NPCs, locations, and strategies.

IMPORTANT GUIDELINES:
- Be helpful, friendly, and concise
- Use information from the wiki pages provided below when relevant
- If you cite information from the wiki, mention which guide it's from
- If the wiki doesn't have the answer, say so and offer general Pixels Online knowledge
- Keep answers clear and actionable
- Use bullet points for lists
- Add relevant emoji occasionally (but not too many!)

`;

  if (wikiContext && wikiContext.length > 0) {
    prompt += `\nWIKI CONTENT AVAILABLE:\n\n`;
    wikiContext.forEach((page, index) => {
      const excerpt = page.content.substring(0, 500).replace(/\n/g, ' ');
      prompt += `[${index + 1}] "${page.title}" (Category: ${page.category})\n`;
      prompt += `   Slug: ${page.slug}\n`;
      prompt += `   Excerpt: ${excerpt}...\n\n`;
    });
  } else {
    prompt += `\nNOTE: No directly relevant wiki pages found for this question. Use your general knowledge of Pixels Online to help.\n`;
  }

  return prompt;
}

// Format response with citation links
function formatResponseWithCitations(answer, wikiContext) {
  const citations = [];
  
  // Extract any page references from the response
  wikiContext.forEach((page, index) => {
    const pageNum = index + 1;
    if (answer.includes(`[${pageNum}]`) || answer.toLowerCase().includes(page.title.toLowerCase())) {
      citations.push({
        title: page.title,
        slug: page.slug,
        category: page.category
      });
    }
  });
  
  return {
    text: answer,
    citations: citations
  };
}

module.exports = router;
