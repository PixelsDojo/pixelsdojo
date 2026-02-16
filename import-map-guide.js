// import-map-guide.js
// ONE-TIME SCRIPT: Run this once to import the map guide, then delete this file
// Usage: node import-map-guide.js

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Match your database.js setup
const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/pixels-dojo.db' : './pixels-dojo.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// The full HTML content for the map guide
const mapGuideContent = `<!-- TerraVilla Complete Map Guide -->
<html><head></head><body><div class="map-guide-container">
    <div class="map-intro">
        <h2>🗺️ Complete TerraVilla Map Guide</h2>
        <p class="last-updated">Last Updated: February 2026</p>
        <p class="intro-text">Your comprehensive guide to every location, NPC, and secret in TerraVilla and surrounds. Navigate the world of Pixels like a pro!</p>
    </div>

    <div class="location-section featured-location">
        <h3 class="location-header">🏠 YOUR SPECK (Your Personal Home)</h3>
        <p class="location-description">What it is: Your personal house where you live and sleep when you start playing.</p>
        <div class="location-details">
            <p class="highlight-info"><strong>Key Features:</strong></p>
            <p>Storage chests for items</p>
            <p>Access to your personal task board (Infinifunnel)</p>
            <p>Bed (sleep for 300 energy!)</p>
            <p>Farmable land</p>
            <p>Trees to cut</p>
            <p>Rocks to mine</p>
            <p>BBQ station</p>
            <p>Cooking station</p>
            <p>Crafting capabilities</p>
            <p>Decorating options</p>
            <p class="highlight-info"><strong>Upgrades: You can make your Speck bigger by upgrading it. You can use more industries on your speck as you upgrade.</strong></p>
            <p>Industry Limit: There's a limit to how many industries you can have active at one time on your Speck. Tip: Use your remover to uplift the industries you arent using and have a chest indoorsd devoted to extra kilns, stoves, woodwoprk and metal working stations and seeds, soil, bbqs and trees oudoors for efficiency</p>
            <p>NFT Land vs. Speck: Even if you buy an NFT land, you'll still have your Speck—everyone gets one when starting.</p>
            <p class="feature-item"><strong>Leaving Your Speck: Walk out the front gate → You'll arrive at TerraVilla Main Fountain</strong></p>
            <p class="feature-item"><strong>Central Feature: The Main Fountain (Everything radiates from here)</strong></p>
            <img src="/images/map/10000000000004A4000002FF333E784D.jpg" alt="TerraVilla Location 1" class="map-image" loading="lazy">
            <p class="feature-item"><strong>LEFT SIDE (Below fountain):</strong></p>
            <p>Infiniportal - Portal to different NFT lands</p>
            <img src="/images/map/10000000000001860000014CE06788A3.jpg" alt="TerraVilla Location 2" class="map-image" loading="lazy">
            <p class="feature-item"><strong>RIGHT SIDE (Above fountain):</strong></p>
            <p>Pixel Dungeons Link - Looks like a mine with goblins, connects to PixelDungeons game</p>
            <img src="/images/map/10000000000001B10000010CF6E17F0A.jpg" alt="TerraVilla Location 3" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 ABOVE THE FOUNTAIN:</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Billboards displaying:</strong></p>
            <p>TerraVilla map</p>
            <p>Top NFT lands</p>
            <p>Pixel Post (news/updates)</p>
            <p>Events calendar</p>
            <img src="/images/map/10000000000004A3000000CF2D3649A9.jpg" alt="TerraVilla Location 4" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 BELOW THE FOUNTAIN:</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Two purple manned stalls:</strong></p>
            <p class="feature-item"><strong>Right stall: Buy NFTs</strong></p>
            <p class="feature-item"><strong>Left stall: Buy VIP membership</strong></p>
            <img src="/images/map/1000000000000473000000DC29498C34.jpg" alt="TerraVilla Location 5" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 RIGHT OF FOUNTAIN:</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Buck's Galore :</strong></p>
            <p class="feature-item"><strong>Front: Buy seeds and equipment</strong></p>
            <p class="feature-item"><strong>Back: The Market - Trade items with other players using coins (requires reputation!)</strong></p>
            <p class="npc-info">👥 <strong>NPCs: Buck at the front counter, Peach at the back Market counter</strong></p>
            <img src="/images/map/10000000000001D5000001C200F50037.jpg" alt="TerraVilla Location 6" class="map-image" loading="lazy">
            <p>Pet Store</p>
            <p>Everything related to pets</p>
            <p>Pet food, accessories, etc.</p>
            <p class="npc-info">👥 <strong>NPC: Kirby (Front desk) Penny (Potion Table) Ben (Pet Incubator)</strong></p>
            <img src="/images/map/1000000000000280000001AE60A730CF.jpg" alt="TerraVilla Location 7" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 STRAIGHT ABOVE FOUNTAIN:</h3>
        <div class="location-details">
            <p>Hearth Hall</p>
            <p>Harvest Unions competition for Hearth supremacy</p>
            <p>Compete for $PIXEL rewards</p>
            <p>Choose your faction (Wildgroves, Seedwrights, or Reapers)</p>
            <p class="npc-info">👥 <strong>NPCs: Albus (Hearth Hall Quest) Gianno (Choose Harvest Union) Lucia (Buy Power Offerings and Yield Stone Recipes) Mitchell (Union Info) Wildgroves Booth, Seedwrights Booth, Reapers Booth</strong></p>
            <img src="/images/map/100000000000029900000277699E1B64.jpg" alt="TerraVilla Location 8" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 LEFT OF FOUNTAIN:</h3>
        <div class="location-details">
            <p>Neon Zone (The Arcade)</p>
            <p>Play ranked games to win $PIXEL</p>
            <p>Many Arcade games to choose from ( Squish the Fish, Bunny Baiter, Higher-Lower, Da Bomb, Living Labyrinth, Veggie Vexer) and Leon's Hold'em – a basement poker den.</p>
            <p>Ranked competitions weekly</p>
            <p class="npc-info">👥 <strong>NPCs: Manager Artie, Allison, Buffy, Bart, Gamemaster Flaster, Derek, Neon Leon, The Giraffe</strong></p>
            <p>The Sauna (Next to Neon Zone)</p>
            <p class="feature-item"><strong>Jacuzzi: Available to everyone (faster energy regen)</strong></p>
            <p class="feature-item"><strong>Sauna: VIP members only (1000 energy, 2-3 times daily depending on your irl sleep patterns)</strong></p>
            <p class="npc-info">👥 <strong>NPC: Gurney</strong></p>
            <img src="/images/map/10000000000002D8000001DA406303B2.jpg" alt="TerraVilla Location 9" class="map-image" loading="lazy">
            <p class="feature-item"><strong>Starting from LEFT:</strong></p>
            <p>The Windmill -</p>
            <p>Grind various items into processed materials</p>
            <p class="npc-info">👥 <strong>NPC: Gill</strong></p>
            <img src="/images/map/10000000000001270000018327E33A9F.jpg" alt="TerraVilla Location 10" class="map-image" loading="lazy">
            <p>Theatre</p>
            <p>Weekly AMAs held here</p>
            <p>Energy parties</p>
            <p class="pro-tip">💡 <em>Secret side door: Alina the Witch's location (hidden NPC!)</em></p>
            <img src="/images/map/100000000000041700000191E196132F.jpg" alt="TerraVilla Location 11" class="map-image" loading="lazy">
            <p>Stoneshaping Kiln</p>
            <p>Stone and ore working station</p>
            <p class="npc-info">👥 <strong>NPC: Sandy</strong></p>
            <img src="/images/map/1000000000000209000001A25FCA3F78.jpg" alt="TerraVilla Location 12" class="map-image" loading="lazy">
            <p>Two Empty Buildings (Right side) Barney's Bazaar and The Old Restuarant</p>
            <p>Currently unused</p>
            <p class="pro-tip">💡 <em>Rumor: Pixel Cat Guy opening NFT builder here soon</em></p>
            <img src="/images/map/1000000000000422000001C40AE39103.jpg" alt="TerraVilla Location 13" class="map-image" loading="lazy">
            <p class="feature-item"><strong>Metalworking Station (below empty buildings):</strong></p>
            <p>Craft metal items from metal ore</p>
            <p class="npc-info">👥 <strong>NPC: Smith</strong></p>
            <img src="/images/map/10000000000001E30000015442279538.jpg" alt="TerraVilla Location 14" class="map-image" loading="lazy">
            <p class="feature-item"><strong>Animal Care Section (to the left of metal working:</strong></p>
            <p class="feature-item"><strong>Legacy animals for produce collection:</strong></p>
            <p>Silk Slugs</p>
            <p>Bees (honey, wax)</p>
            <p>Chickens (eggs)</p>
            <p class="npc-info">👥 <strong>NPCs: Ed (Slugs) Amy (Apiary) Cooper (Chickens)</strong></p>
            <img src="/images/map/10000000000003D7000001E1A14BF9DC.jpg" alt="TerraVilla Location 15" class="map-image" loading="lazy">
            <p>Composter (bottom of this area) - Make Animal Care products and farming-related products like fertilizer. Will be inportant for the Animal Care Update.</p>
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 LEFT SIDE:</h3>
        <div class="location-details">
            <p>Woodworking Station</p>
            <p>Forestry Station</p>
            <p class="npc-info">👥 <strong>NPCs: Jack (Woodworking) Jill (Forestry)</strong></p>
            <img src="/images/map/10000000000003B30000024DD00DE88D.jpg" alt="TerraVilla Location 16" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 RIGHT SIDE:</h3>
        <div class="location-details">
            <p>Decor Shop -</p>
            <p>Buy decorative items for your home/land</p>
            <p class="npc-info">👥 <strong>NPCs: Honor (Farm Items) Jerome (Limited-time items) Pixelia (UGCs)</strong></p>
            <img src="/images/map/10000000000001A3000001ACCDD55FAF.jpg" alt="TerraVilla Location 17" class="map-image" loading="lazy">
            <p>The Bank</p>
            <p>Financial functions (swap $PIXEL for coins, etc.)</p>
            <p class="pro-tip">💡 <em>Secret entrance: Basement cave (immediately right after entering)</em></p>
            <p class="npc-info">👥 <strong>NPCs:</strong></p>
            <p class="feature-item"><strong>Reception: Margret (Buy Coins with Pixel)</strong></p>
            <p>Middle Floor: Regis (Buy Quicksilver) Dave (Buy Coins) Elon (Buy Pixel) Upstairs: Lauren (Create a Crypto Wallet) Byron (Deposit and Withdraw Currencies)</p>
            <img src="/images/map/10000000000001A7000001F070EFFD35.jpg" alt="TerraVilla Location 18" class="map-image" loading="lazy">
            <p class="feature-item"><strong>Starting from LEFT:</strong></p>
            <p class="feature-item"><strong>The Drunken Goose : (Local watering hole)</strong></p>
            <p class="highlight-info"><strong>Hidden secret: Entrance to underground rave club!</strong></p>
            <p class="npc-info">👥 <strong>NPC: Goose</strong></p>
            <img src="/images/map/10000000000001F50000022968069401.jpg" alt="TerraVilla Location 19" class="map-image" loading="lazy">
            <p>Winona's Wine Press (On the grass)</p>
            <p>Wine crafting station</p>
            <p>NPC (Winona)</p>
            <img src="/images/map/100000000000020800000179FC7FDA69.jpg" alt="TerraVilla Location 20" class="map-image" loading="lazy">
            <p>Ministry of Innovation ⚙️</p>
            <p>Contains "The Machine" (advanced crafting)</p>
            <p class="npc-info">👥 <strong>NPC: Bitsy</strong></p>
            <img src="/images/map/10000000000001F90000024687774E11.jpg" alt="TerraVilla Location 21" class="map-image" loading="lazy">
            <p>Post Office</p>
            <p>Daily package from Priya (claim daily rewards!)</p>
            <p class="highlight-info"><strong>Hidden door (back): Old Pixel HQ entrance</strong></p>
            <p class="feature-item"><strong>NOCs: Priya (Post Office ) Kathleen and Karen (Pixels HQ)</strong></p>
            <img src="/images/map/1000000000000271000001B169C47429.jpg" alt="TerraVilla Location 22" class="map-image" loading="lazy">
            <p>Giant Stake Statue ?</p>
            <p>Click to access staking app (stake $PIXEL for rewards)</p>
            <p class="feature-item"><strong>https://staking.pixels.xyz/</strong></p>
            <img src="/images/map/10000000000001B5000001D2D985BFF1.jpg" alt="TerraVilla Location 23" class="map-image" loading="lazy">
            <p>Textile Station (On the grass)</p>
            <p>Fabric and textile crafting</p>
            <p class="npc-info">👥 <strong>NPC: Tex</strong></p>
            <img src="/images/map/10000000000001DA00000193996762D9.jpg" alt="TerraVilla Location 24" class="map-image" loading="lazy">
            <img src="/images/map/10000000000002C0000001C1D68A8F12.jpg" alt="TerraVilla Location 25" class="map-image" loading="lazy">
            <p>Entrance to the Beach travel downwards/ South between Post Office and Ministry of Innovation</p>
            <p class="feature-item"><strong>The Beach:</strong></p>
            <p>Frequent energy parties held here</p>
            <p>Popular gathering spot</p>
            <img src="/images/map/100000000000041C0000025B45DED037.jpg" alt="TerraVilla Location 26" class="map-image" loading="lazy">
            <p class="feature-item"><strong>The Boardwalk:</strong></p>
            <p class="feature-item"><strong>Fishing spot: (buy rod at market or Seaside Store)</strong></p>
            <p class="feature-item"><strong>BBQ Station: (left side) NPC: Fuy Geiri</strong></p>
            <p class="feature-item"><strong>Sushi Station (right side) NPC: Cod Stewart</strong></p>
            <p class="feature-item"><strong>Shipping Contracts - Fill orders for Buoy Bucks + $PIXEL NPC: Harbourmaster</strong></p>
            <p class="feature-item"><strong>Seaside Stash - Spend Buoy Bucks here NPC: Marina</strong></p>
            <img src="/images/map/100000000000037E0000027F005591A3.jpg" alt="TerraVilla Location 27" class="map-image" loading="lazy">
            <p>The Musty Lobster Ship ⚓</p>
            <p>Manned by Captain McKelpy (The Fleet and The Fish Quest)</p>
            <img src="/images/map/10000000000004430000027BC18D50D3.jpg" alt="TerraVilla Location 28" class="map-image" loading="lazy">
            <p class="feature-item"><strong>Location: Behind Hearth Hall, follow the road</strong></p>
            <p class="feature-item"><strong>Status: Currently closed, opens for special events (dev-scheduled)</strong></p>
            <p class="feature-item"><strong>Events: Seasonal celebrations, limited-time activities</strong></p>
            <img src="/images/map/1000000000000630000002FC78BF2A52.jpg" alt="TerraVilla Location 29" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 LEFT PATH:</h3>
        <div class="location-details">
            <p>Football Field ⚽ - Sports activities, events</p>
            <img src="/images/map/1000000000000456000002934C91E5FC.jpg" alt="TerraVilla Location 30" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 RIGHT PATH:</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Guild Castle:</strong></p>
            <p>Guild information and management</p>
            <p>Access to Spore Sport Caves (below the hall)</p>
            <p class="npc-info">👥 <strong>NPCs: Gabby Dizon, Player W3, Luke, Jolt (Spore Sport Cave)</strong></p>
            <p class="feature-item"><strong>Guild Castle Gardens:</strong></p>
            <p class="feature-item"><strong>NOCs: Glint from FableBourne with portal to FableBourne lands , Kiko</strong></p>
            <img src="/images/map/100000000000058200000252C9E7FC01.jpg" alt="TerraVilla Location 31" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 HIDDEN AREAS:</h3>
        <div class="location-details">
            <img src="/images/map/1000000000000455000002892211325C.jpg" alt="TerraVilla Location 32" class="map-image" loading="lazy">
            <p>Cave under The Bank</p>
            <img src="/images/map/10000000000003C3000002150D72B611.jpg" alt="TerraVilla Location 33" class="map-image" loading="lazy">
            <p>Spore Sports Cave</p>
            <img src="/images/map/10000000000004D50000029D2D2D464E.jpg" alt="TerraVilla Location 34" class="map-image" loading="lazy">
            <p>Alina's Grotto</p>
            <img src="/images/map/10000000000001330000012854DCF66E.jpg" alt="TerraVilla Location 35" class="map-image" loading="lazy">
            <img src="/images/map/100000000000027A0000027AFBB0020A.jpg" alt="TerraVilla Location 36" class="map-image" loading="lazy">
            <p>[Hearth Hall]</p>
            <p>↑</p>
            <p>[Billboards Area - Map/Events/News]</p>
            <p>↑</p>
            <p>[Neon Zone] ← [FOUNTAIN] → [Buck's Galore]</p>
            <p>+ Sauna + Market</p>
            <p>+ Pet Store</p>
            <p>↓</p>
            <p>[Purple Stalls]</p>
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 VIP (L) | NFT (R)</h3>
        <div class="location-details">
            <p>↓</p>
            <p>[Infiniportal] [Pixel Dungeons]</p>
            <p class="feature-item"><strong>Roads Leading Out:</strong></p>
            <p>Behind Hearth Hall → Carnival</p>
            <p>Rainbow Left → Football Field</p>
            <p>Rainbow Right → Guild Hall</p>
            <p>Below Fountain → Beach Road</p>
            <p>Last updated February 2026 by Lizzy Sims</p>
        </div>
    </div>
</div>

<style>
.map-guide-container {
    max-width: 1000px;
    margin: 0 auto;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.map-intro {
    background: linear-gradient(135deg, rgba(237, 255, 132, 0.1), rgba(0, 255, 255, 0.1));
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    border: 2px solid rgba(237, 255, 132, 0.3);
}

.map-intro h2 {
    color: var(--yellow, #edff84);
    margin-bottom: 0.5rem;
    font-size: 2rem;
}

.last-updated {
    color: #999;
    font-size: 0.9rem;
    margin-bottom: 1rem;
}

.intro-text {
    color: #d0d0ff;
    font-size: 1.1rem;
    line-height: 1.6;
}

.location-section {
    background: rgba(20, 20, 40, 0.5);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 10px;
    border-left: 4px solid rgba(0, 255, 255, 0.5);
}

.main-location {
    border-left: 4px solid rgba(237, 255, 132, 0.8);
    background: rgba(237, 255, 132, 0.05);
}

.featured-location {
    border-left: 4px solid #ff6b6b;
    background: rgba(255, 107, 107, 0.05);
}

.location-header {
    color: var(--cyan, #00ffff);
    font-size: 1.5rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid rgba(0, 255, 255, 0.2);
    padding-bottom: 0.5rem;
}

.featured-location .location-header {
    color: #ff6b6b;
}

.main-location .location-header {
    color: var(--yellow, #edff84);
}

.location-description {
    color: #b0b0ff;
    font-style: italic;
    margin-bottom: 1rem;
}

.sub-location {
    color: var(--yellow, #edff84);
    font-size: 1.2rem;
    margin-bottom: 0.8rem;
}

.location-details {
    color: #d0d0ff;
    line-height: 1.8;
}

.location-details p {
    margin-bottom: 0.8rem;
}

.npc-info {
    background: rgba(0, 255, 255, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border-left: 3px solid var(--cyan, #00ffff);
    margin: 1rem 0;
}

.feature-item {
    padding-left: 1.5rem;
    position: relative;
}

.feature-item::before {
    content: "▸";
    position: absolute;
    left: 0;
    color: var(--cyan, #00ffff);
}

.highlight-info {
    background: rgba(237, 255, 132, 0.1);
    padding: 0.8rem;
    border-radius: 6px;
    border-left: 3px solid var(--yellow, #edff84);
    margin: 1rem 0;
}

.pro-tip {
    background: rgba(255, 165, 0, 0.1);
    padding: 0.8rem;
    border-radius: 6px;
    border-left: 3px solid #ffa500;
    margin: 1rem 0;
    font-style: italic;
}

.map-image {
    width: 100%;
    max-width: 600px;
    height: auto;
    border-radius: 8px;
    margin: 1.5rem 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(0, 255, 255, 0.2);
}

.map-image:hover {
    transform: scale(1.02);
    transition: transform 0.3s ease;
    border-color: var(--cyan, #00ffff);
}

@media (max-width: 768px) {
    .map-intro {
        padding: 1.5rem;
    }
    
    .map-intro h2 {
        font-size: 1.5rem;
    }
    
    .location-section {
        padding: 1rem;
    }
    
    .map-image {
        max-width: 100%;
    }
}
</style></body></html>

<div class="page-content">
  <h1>🗺️ Complete TerraVilla Map Guide</h1>
  <p>Your comprehensive guide to every location, NPC, and secret in TerraVilla and surrounds.</p>
  
  <!-- The rest of the HTML goes here -->
</div>
`;

// Check if page already exists
db.get('SELECT id FROM pages WHERE slug = ?', ['terravilla-map-guide'], (err, row) => {
  if (err) {
    console.error('❌ Error checking for existing page:', err.message);
    db.close();
    process.exit(1);
  }
  
  if (row) {
    console.log('⚠️  Map guide already exists! Updating instead...');
    
    db.run(`UPDATE pages 
            SET content = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE slug = ?`,
      [mapGuideContent, 'terravilla-map-guide'],
      function(updateErr) {
        if (updateErr) {
          console.error('❌ Update failed:', updateErr.message);
          process.exit(1);
        }
        console.log('✅ Map guide updated successfully!');
        console.log('🗺️  View at: /pages/terravilla-map-guide');
        db.close();
        process.exit(0);
      }
    );
  } else {
    // Insert new page
    db.run(`INSERT INTO pages (
      slug,
      title,
      content,
      category,
      difficulty,
      summary,
      author_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        'terravilla-map-guide',
        'Complete TerraVilla Map Guide',
        mapGuideContent,
        'orientation',
        'Beginner',
        'Your comprehensive guide to every location, NPC, and secret in TerraVilla and surrounds. Navigate the world of Pixels like a pro!',
        1 // author_id - adjust if needed
      ],
      function(insertErr) {
        if (insertErr) {
          console.error('❌ Import failed:', insertErr.message);
          process.exit(1);
        }
        console.log('✅ Map guide imported successfully!');
        console.log(`📄 Page ID: ${this.lastID}`);
        console.log('🗺️  View at: /pages/terravilla-map-guide');
        db.close();
        process.exit(0);
      }
    );
  }
});
