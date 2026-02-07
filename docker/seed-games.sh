#!/bin/bash
# Seed GameStore Database with Test Data
# This script populates the games table with a comprehensive test dataset

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-gamestore_user}
DB_PASSWORD=${DB_PASSWORD:-gamestore_password}
DB_NAME=${DB_NAME:-gamestore_db}
DB_PORT=${DB_PORT:-5432}

# Function to run SQL against the database
run_sql() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -c "$1"
}

echo "🎮 Seeding GameStore Database with Test Games..."
echo "=================================================="

# Insert games data
run_sql "
INSERT INTO games (title, description, genre, platform, price, rating, release_date, created_at, updated_at) VALUES
-- Action Games
('Elden Ring', 'A masterpiece from FromSoftware. An epic dark fantasy action RPG with challenging combat and breathtaking environments.', 'Action', 'PS5', 59.99, 4.8, '2022-02-25', NOW(), NOW()),
('God of War Ragnarok', 'The conclusion to Kratos journey. Witness the end of Norse mythology in this stunning action-adventure.', 'Action', 'PS5', 69.99, 4.9, '2022-11-09', NOW(), NOW()),
('Cyberpunk 2077', 'Immerse yourself in Night City. A first-person action-adventure set in a dystopian future with countless possibilities.', 'Action', 'PC', 49.99, 4.2, '2020-12-10', NOW(), NOW()),
('Halo Infinite', 'Master Chief returns. Experience the next chapter of the legendary Halo franchise with stunning multiplayer.', 'Action', 'Xbox Series X', 59.99, 4.6, '2021-12-08', NOW(), NOW()),
('Devil May Cry 5', 'Stylish demon slaying action. Unleash flashy combos and devastating abilities as three iconic demons hunters.', 'Action', 'PS4', 39.99, 4.7, '2019-03-08', NOW(), NOW()),
('Tomb Raider', 'Follow Lara Croft on an adventure across dangerous ruins and ancient tombs filled with perilous traps.', 'Action', 'PC', 29.99, 4.5, '2013-03-05', NOW(), NOW()),
('Uncharted 4: A Thief''s End', 'Nathan Drake''s final adventure. A cinematic masterpiece combining adventure with intense action sequences.', 'Action', 'PS4', 39.99, 4.8, '2016-05-10', NOW(), NOW()),
('Far Cry 6', 'Guerrilla warfare in a tropical paradise. Liberate Yara from tyrranical rule with freedom fighters.', 'Action', 'PS5', 49.99, 4.3, '2021-10-07', NOW(), NOW()),
('Metro Exodus', 'Post-apocalyptic survival. Journey across a ravaged Russia in this atmospheric first-person shooter.', 'Action', 'PC', 39.99, 4.6, '2019-02-15', NOW(), NOW()),
('Resident Evil Village', 'Lady Dimitrescu awaits. Enter a gothic village filled with terrifying creatures and mystery.', 'Action', 'PS5', 49.99, 4.5, '2021-05-09', NOW(), NOW()),

-- RPG Games
('Baldurs Gate 3', 'The ultimate RPG experience. Dive into Faerûn with near-infinite possibilities in this legendary CRPG.', 'RPG', 'PC', 59.99, 4.9, '2023-08-03', NOW(), NOW()),
('Final Fantasy VII Remake', 'A reimagining of the classic. Experience Cloud''s journey in Midgar like never before.', 'RPG', 'PS4', 59.99, 4.7, '2020-04-10', NOW(), NOW()),
('The Witcher 3: Wild Hunt', 'Monster hunting epic. Become Geralt of Rivia and hunt monsters across a vast open world.', 'RPG', 'PC', 39.99, 4.8, '2015-05-19', NOW(), NOW()),
('Dragon''s Dogma 2', 'Reborn adventure. Create your pawn and explore a vast world filled with colossal creatures.', 'RPG', 'PS5', 59.99, 4.4, '2024-03-22', NOW(), NOW()),
('Tales of Arise', 'New generation of Tales. A beautiful JRPG with engaging characters and stylish combat.', 'RPG', 'PS4', 49.99, 4.5, '2021-09-10', NOW(), NOW()),
('Persona 5 Royal', 'Persona mastery. Steal hearts and solve mysteries as a group of high school thieves.', 'RPG', 'PS4', 49.99, 4.8, '2019-10-31', NOW(), NOW()),
('Fire Emblem: Three Houses', 'Strategic warfare. Lead academy students to victory in turn-based tactical combat.', 'RPG', 'Nintendo Switch', 49.99, 4.6, '2019-07-26', NOW(), NOW()),
('Starfield', 'Infinite exploration. Create your own space-faring adventure across a massive universe.', 'RPG', 'Xbox Series X', 69.99, 4.3, '2023-09-06', NOW(), NOW()),
('Diablo IV', 'The reckoning returns. Battle demonic hordes in this dark action RPG.', 'RPG', 'PC', 69.99, 4.2, '2023-06-06', NOW(), NOW()),
('Chrono Trigger', 'Time travel adventure. A timeless JRPG with an incredible soundtrack and engaging story.', 'RPG', 'Nintendo Switch', 14.99, 4.9, '1995-03-11', NOW(), NOW()),
('NieR: Automata', 'Philosophical action RPG. A story-driven experience with multiple endings and profound themes.', 'RPG', 'PS4', 29.99, 4.7, '2017-03-17', NOW(), NOW()),

-- Strategy Games
('Civilization VI', 'Build an empire. Lead your civilization from ancient times to the modern era in this turn-based strategy.', 'Strategy', 'PC', 49.99, 4.7, '2016-10-21', NOW(), NOW()),
('XCOM 2', 'Tactical warfare. Lead a resistance against an alien occupation with turn-based battles.', 'Strategy', 'PC', 39.99, 4.6, '2016-02-05', NOW(), NOW()),
('Total War: Warhammer III', 'Fantasy warfare. Command legendary armies in huge tactical battles across the Old World.', 'Strategy', 'PC', 59.99, 4.5, '2022-02-17', NOW(), NOW()),
('StarCraft II', 'Real-time strategy classic. Three unique factions battle for supremacy in a sci-fi universe.', 'Strategy', 'PC', 39.99, 4.6, '2010-07-27', NOW(), NOW()),
('Fire Emblem: Conquest', 'Tactical RPG. Choose your destiny in this strategic military adventure with permadeath units.', 'Strategy', 'Nintendo 3DS', 39.99, 4.5, '2012-04-19', NOW(), NOW()),
('Crusader Kings III', 'Medieval dynasty simulator. Create generations of rulers and manage complex political situations.', 'Strategy', 'PC', 39.99, 4.5, '2020-09-01', NOW(), NOW()),
('Europa Universalis IV', 'Grand strategy. Play as any nation from 1444-1821 and reshape world history.', 'Strategy', 'PC', 39.99, 4.6, '2013-08-13', NOW(), NOW()),

-- RPG/Strategy Hybrid
('Divinity: Original Sin 2', 'Turn-based RPG. Craft spells, engage in tactical battles, and explore a huge world.', 'RPG', 'PC', 49.99, 4.8, '2017-09-21', NOW(), NOW()),
('Tactics Ogre: Reborn', 'Remastered tactics. Experience updated graphics and refinements to this tactical epic.', 'Strategy', 'PC', 49.99, 4.6, '2023-11-09', NOW(), NOW()),

-- Sports Games
('NBA 2K24', 'Basketball simulation. Play, compete, and create your legend in this premier basketball game.', 'Sports', 'PS5', 69.99, 4.2, '2023-09-08', NOW(), NOW()),
('Madden NFL 24', 'American football dominance. Lead your team to the Super Bowl in this authentic football sim.', 'Sports', 'PS5', 69.99, 4.1, '2023-08-18', NOW(), NOW()),
('FIFA 24', 'Football glory. Manage your team and compete for the championship in this iconic sports title.', 'Sports', 'PS5', 69.99, 4.3, '2023-09-29', NOW(), NOW()),
('F1 24', 'Formula racing. Experience the speed and intensity of Formula 1 racing.', 'Sports', 'PC', 59.99, 4.5, '2024-03-01', NOW(), NOW()),
('Tennis World Tour 2', 'Tennis championship. Compete as legendary and modern tennis players worldwide.', 'Sports', 'PS4', 39.99, 3.8, '2022-08-30', NOW(), NOW()),

-- Adventure Games
('The Legend of Zelda: Breath of the Wild', 'Open-air adventure. A revolutionary game offering complete exploration freedom in Hyrule.', 'Adventure', 'Nintendo Switch', 59.99, 4.9, '2017-03-03', NOW(), NOW()),
('The Last of Us Part I', 'Post-apocalyptic journey. Experience an emotional story of survival and human connection.', 'Adventure', 'PS5', 69.99, 4.8, '2022-09-02', NOW(), NOW()),
('Uncharted: Legacy of Thieves Collection', 'Adventure compilation. Experience two classic treasure-hunting adventures remastered.', 'Adventure', 'PS5', 49.99, 4.6, '2022-01-28', NOW(), NOW()),
('It Takes Two', 'Co-op adventure. A unique cooperative game about relationships told through gameplay.', 'Adventure', 'PC', 29.99, 4.7, '2021-03-26', NOW(), NOW()),
('A Plague Tale: Innocence', 'Medieval mystery. Navigate a rat-infested world with your sister in this artistic adventure.', 'Adventure', 'PS4', 39.99, 4.6, '2019-05-14', NOW(), NOW()),

-- Shooter Games
('Call of Duty Modern Warfare II', 'Modern combat. Intense multiplayer and campaign action with cutting-edge weapons.', 'Shooter', 'PS5', 69.99, 4.4, '2022-10-28', NOW(), NOW()),
('Destiny 2', 'Space warfare PvE/PvP. Become a Guardian and fight against cosmic threats.', 'Shooter', 'PC', 0.00, 4.3, '2017-09-06', NOW(), NOW()),
('Overwatch 2', 'Team-based shooter. Work with teammates to control objectives and defeat enemies.', 'Shooter', 'PC', 0.00, 4.2, '2022-10-04', NOW(), NOW()),
('Valorant', 'Tactical shooter. Precision-based first-person shooter with unique characters and abilities.', 'Shooter', 'PC', 0.00, 4.5, '2020-06-02', NOW(), NOW()),
('Apex Legends', 'Battle royale. Drop into matches and outlast opponents with your squad of legends.', 'Shooter', 'PC', 0.00, 4.4, '2019-02-04', NOW(), NOW()),
('Battlefield 2042', 'Large-scale warfare. Massive multiplayer battles with destructible environments.', 'Shooter', 'PS5', 49.99, 3.9, '2021-11-19', NOW(), NOW()),
('Counter-Strike 2', 'Competitive FPS. The legendary tactical shooter with a massive esports scene.', 'Shooter', 'PC', 0.00, 4.6, '2023-09-01', NOW(), NOW()),
('Halo 5: Guardians', 'Master Chief saga continues. Unique multiplayer modes and competitive gameplay.', 'Shooter', 'Xbox One', 39.99, 4.3, '2015-10-27', NOW(), NOW()),

-- Puzzle Games
('Portal 2', 'First-person puzzle. Solve mind-bending physics puzzles using a portal gun.', 'Puzzle', 'PC', 19.99, 4.8, '2011-04-19', NOW(), NOW()),
('The Witness', 'Island of puzzles. Explore a mysterious island filled with intricate environmental puzzles.', 'Puzzle', 'PC', 39.99, 4.6, '2016-01-26', NOW(), NOW()),
('Tetris Effect: Connected', 'Tetris reimagined. Classic puzzle gameplay with stunning visuals and music.', 'Puzzle', 'PS5', 39.99, 4.5, '2020-11-10', NOW(), NOW()),
('Puyo Puyo Tetris', 'Puzzle mashup. Combine two classic puzzle games in one fantastic experience.', 'Puzzle', 'Nintendo Switch', 29.99, 4.4, '2017-03-28', NOW(), NOW()),

-- Platformer Games
('Hollow Knight', 'Metroidvania classic. Explore a haunting underground kingdom filled with secrets and challenging combat.', 'Platformer', 'Nintendo Switch', 14.99, 4.7, '2017-02-24', NOW(), NOW()),
('Celeste', 'Challenging climb. A precise platformer about climbing a mountain with heartfelt storytelling.', 'Platformer', 'Nintendo Switch', 19.99, 4.8, '2018-01-25', NOW(), NOW()),
('Sonic Frontiers', 'Sonic adventure. High-speed action in a massive open-world environment with classic Sonic style.', 'Platformer', 'PS5', 49.99, 4.3, '2022-11-08', NOW(), NOW()),
('Super Mario Odyssey', 'Hat possession adventure. Throw your hat to capture enemies and solve puzzles.', 'Platformer', 'Nintendo Switch', 59.99, 4.9, '2017-10-27', NOW(), NOW()),
('Donkey Kong Country: Tropical Freeze', 'Barrel blasting adventure. A challenging and colorful side-scrolling platformer.', 'Platformer', 'Nintendo Switch', 49.99, 4.7, '2014-02-21', NOW(), NOW()),

-- Horror Games
('Resident Evil 4', 'Action horror classic. Rescue the President''s daughter from villainous cultists.', 'Horror', 'PS4', 29.99, 4.8, '2005-01-11', NOW(), NOW()),
('Dead Space', 'Sci-fi horror. Mine asteroids for resources while fighting necromorphs.', 'Horror', 'PC', 49.99, 4.6, '2008-10-14', NOW(), NOW()),
('Alan Wake 2', 'Psychological horror. A gripping story of a writer trapped in a dark supernatural world.', 'Horror', 'PS5', 59.99, 4.7, '2023-10-27', NOW(), NOW()),
('The Evil Within', 'Survival horror. Navigate nightmarish worlds and uncover a conspiracy.', 'Horror', 'PS4', 39.99, 4.5, '2014-10-14', NOW(), NOW()),

-- Simulation Games
('Microsoft Flight Simulator', 'Realistic flying. Explore the entire world in stunning detail from the cockpit.', 'Simulation', 'PC', 59.99, 4.6, '2020-08-18', NOW(), NOW()),
('Euro Truck Simulator 2', 'Truck driving sim. Deliver cargo across Europe in this relaxing simulation.', 'Simulation', 'PC', 19.99, 4.6, '2012-10-19', NOW(), NOW()),
('SimCity', 'City building classic. Create and manage a thriving metropolis.', 'Simulation', 'PC', 39.99, 3.8, '2013-03-05', NOW(), NOW()),
('The Sims 4', 'Life simulation. Control virtual people''s lives and aspirations.', 'Simulation', 'PC', 39.99, 4.4, '2014-09-02', NOW(), NOW()),

-- Indie Games
('Hades', 'Roguelike masterpiece. Escape the underworld in this beautiful action game with incredible art.', 'Indie', 'Nintendo Switch', 24.99, 4.8, '2020-09-17', NOW(), NOW()),
('Stardew Valley', 'Cozy farming. Escape to the countryside and build your farm dream.', 'Indie', 'PC', 14.99, 4.9, '2016-02-28', NOW(), NOW()),
('Hollow Knight: Silksong', 'Exploration adventure. Journey through a new realm as the mysterious Hornet.', 'Indie', 'Nintendo Switch', 14.99, 4.7, '2024-02-29', NOW(), NOW()),
('Cuphead', 'Run and gun classic. Defeat bosses in this hand-drawn animated shooter.', 'Indie', 'PC', 19.99, 4.6, '2017-09-29', NOW(), NOW()),
('Undertale', 'Soulful adventure. Make choices that determine the fate of monsters and humans.', 'Indie', 'PC', 9.99, 4.8, '2015-09-15', NOW(), NOW()),
('Outer Wilds', 'Cosmic exploration. Solve the mysteries of a doomed solar system.', 'Indie', 'PC', 24.99, 4.8, '2019-05-28', NOW(), NOW()),
('Subnautica', 'Underwater survival. Explore an alien ocean planet filled with strange creatures.', 'Indie', 'PC', 29.99, 4.7, '2018-12-18', NOW(), NOW()),
('Among Us', 'Social deduction. Imposters hide among crewmates in this multiplayer game.', 'Indie', 'PC', 4.99, 4.5, '2018-06-15', NOW(), NOW()),

-- Fighting Games
('Street Fighter 6', 'Fighting evolution. Train, compete, and master this legendary fighting franchise.', 'Fighting', 'PS5', 59.99, 4.6, '2023-06-02', NOW(), NOW()),
('Tekken 8', 'Iron fist tournament. Battle fierce opponents in this 3D fighting game.', 'Fighting', 'PS5', 69.99, 4.7, '2024-01-26', NOW(), NOW()),
('Mortal Kombat 11', 'Brutal combat. Gruesome fights with iconic characters and fatalities.', 'Fighting', 'PS4', 39.99, 4.5, '2019-04-23', NOW(), NOW()),
('Super Smash Bros. Ultimate', 'Nintendo''s fighting phenomenon. Every character ever in one epic battle game.', 'Fighting', 'Nintendo Switch', 59.99, 4.8, '2018-12-07', NOW(), NOW()),

-- Racing Games
('Gran Turismo 7', 'Racing simulation. Authentically detailed cars and tracks worldwide.', 'Racing', 'PS5', 59.99, 4.5, '2022-03-04', NOW(), NOW()),
('Forza Horizon 5', 'Open-world racing. Beautiful Mexican landscapes with hundreds of cars.', 'Racing', 'Xbox Series X', 69.99, 4.8, '2021-11-09', NOW(), NOW()),
('Need for Speed Unbound', 'Street racing festival. Underground racing culture with stylish visuals.', 'Racing', 'PS5', 69.99, 4.2, '2022-12-02', NOW(), NOW()),
('Mario Kart 8 Deluxe', 'Karting classic. Race with Nintendo characters on creative tracks.', 'Racing', 'Nintendo Switch', 49.99, 4.8, '2017-04-28', NOW(), NOW()),
('Dirt 5', 'Rally racing adventure. Off-road racing across diverse global locations.', 'Racing', 'PS5', 39.99, 4.2, '2020-11-06', NOW(), NOW()),

-- Open World Games
('Red Dead Redemption 2', 'Western masterpiece. Experience the Van Der Linde gang''s final days.', 'Open World', 'PS4', 49.99, 4.8, '2018-10-26', NOW(), NOW()),
('Grand Theft Auto V', 'Crime sandbox. Play as three criminals in modern Los Santos.', 'Open World', 'PS5', 59.99, 4.7, '2013-09-17', NOW(), NOW()),
('Skyrim', 'Fantasy epic. Explore a vast open world filled with dragons and magic.', 'Open World', 'PC', 39.99, 4.8, '2011-11-11', NOW(), NOW()),
('Fallout 4', 'Post-apocalyptic exploration. Survive and thrive in a nuclear wasteland.', 'Open World', 'PC', 39.99, 4.4, '2015-11-10', NOW(), NOW()),
('The Outer Worlds', 'Space exploration RPG. A smaller-scale open world with big personality.', 'Open World', 'PC', 29.99, 4.3, '2019-10-25', NOW(), NOW()),
('Hogwarts Legacy', 'Wizard academy adventure. Experience the wizarding world in the 1800s.', 'Open World', 'PS5', 69.99, 4.5, '2023-02-10', NOW(), NOW()),

-- Story-Driven Games
('Life is Strange', 'Narrative adventure. Time-manipulating choices shape a supernatural mystery.', 'Adventure', 'PC', 14.99, 4.6, '2015-01-30', NOW(), NOW()),
('The Walking Dead Season 1', 'Zombie narrative. Your choices drive the story in this Telltale adventure.', 'Adventure', 'PC', 19.99, 4.7, '2012-04-24', NOW(), NOW()),
('What Remains of Edith Finch', 'Family memory exploration. A poignant journey through a family''s history.', 'Adventure', 'PC', 19.99, 4.8, '2017-04-25', NOW(), NOW()),
('Disco Elysium', 'RPG detective noir. Solve a murder while discovering yourself.', 'RPG', 'PC', 39.99, 4.8, '2019-10-15', NOW(), NOW()),

-- Rhythm/Music Games
('Beat Saber', 'VR rhythm game. Slash blocks to the beat of electronic music.', 'Rhythm', 'Meta Quest 3', 29.99, 4.7, '2018-11-21', NOW(), NOW()),
('Guitar Hero Live', 'Rock out experience. Play guitar alongside real music videos.', 'Rhythm', 'PS4', 59.99, 4.4, '2015-10-20', NOW(), NOW()),
('Just Dance 2024', 'Dancing party game. Choreographed dances to current hit songs.', 'Rhythm', 'Nintendo Switch', 39.99, 4.3, '2023-10-24', NOW(), NOW()),

-- Educational Games
('Duolingo Max', 'Language learning game. Master languages through interactive gameplay.', 'Educational', 'PC', 9.99, 4.6, '2012-06-19', NOW(), NOW()),
('Kerbal Space Program', 'Space simulation. Build and manage a space program with realistic physics.', 'Educational', 'PC', 39.99, 4.7, '2015-04-27', NOW(), NOW()),

-- More Action Games
('Sekiro: Shadows Die Twice', 'Samurai challenge. A FromSoftware masterpiece of precision combat.', 'Action', 'PS4', 49.99, 4.8, '2019-03-22', NOW(), NOW()),
('Devil May Cry 3', 'Action style icon. Dante''s awakening in this stylish demon-slaying adventure.', 'Action', 'PS2', 19.99, 4.7, '2001-02-17', NOW(), NOW()),
('Bayonetta', 'Witchy action. Sensational combat with an immortal witch.', 'Action', 'Nintendo Switch', 19.99, 4.6, '2009-10-29', NOW(), NOW()),
('Ghost of Tsushima', 'Samurai honor. A beautiful open-world samurai adventure in feudal Japan.', 'Action', 'PS4', 49.99, 4.7, '2020-07-17', NOW(), NOW()),
('Asura''s Wrath', 'Mythological action. Intense battles with a demigod seeking vengeance.', 'Action', 'PS3', 19.99, 4.5, '2012-02-21', NOW(), NOW()),
('Just Cause 4', 'Explosive freedom. Cause mayhem in a massive open world with destructible everything.', 'Action', 'PS4', 29.99, 4.2, '2018-12-04', NOW(), NOW()),
('Vanquish', 'Sci-fi action. A jetpack-powered soldier fights alien enemies.', 'Action', 'PS3', 19.99, 4.4, '2010-10-19', NOW(), NOW()),
('The Force Unleashed', 'Star Wars power fantasy. Become a Sith and unleash devastating Force abilities.', 'Action', 'PS3', 19.99, 4.5, '2008-09-16', NOW(), NOW()),

-- More RPG Games
('Kingdom Come: Deliverance', 'Medieval immersion. A historically grounded RPG set in Bohemia.', 'RPG', 'PC', 44.99, 4.5, '2018-02-13', NOW(), NOW()),
('Monster Hunter: World', 'Creature hunting. Craft gear and battle massive monsters in a beautiful world.', 'RPG', 'PS4', 29.99, 4.6, '2018-01-26', NOW(), NOW()),
('Dark Souls III', 'Can''t die experience. A dark, challenging action RPG by FromSoftware.', 'RPG', 'PS4', 39.99, 4.7, '2016-03-24', NOW(), NOW()),
('Demon''s Souls Remake', 'PS5 showcase. A beautiful remake of the original challenging action RPG.', 'RPG', 'PS5', 69.99, 4.6, '2020-11-12', NOW(), NOW()),
('Bloodborne', 'Victorian horror. Hunt beasts in this gothic action RPG.', 'RPG', 'PS4', 39.99, 4.8, '2015-03-24', NOW(), NOW()),

-- More Platformers
('Super Meat Boy', 'Tough-as-nails platformer. Navigate through impossible levels at high speed.', 'Platformer', 'PC', 14.99, 4.7, '2010-10-20', NOW(), NOW()),
('Mega Man 11', 'Robot master returns. The classic Blue Bomber fights challenging robots.', 'Platformer', 'PC', 29.99, 4.4, '2018-10-02', NOW(), NOW()),
('Ratchet & Clank', 'Lombax adventure. Swap weapons and ride around alien worlds.', 'Platformer', 'PS4', 39.99, 4.6, '2016-04-12', NOW(), NOW()),

-- VR Games
('Half-Life: Alyx', 'VR landmark. A prequel to Half-Life 2 fully realized in virtual reality.', 'Shooter', 'PC (VR)', 59.99, 4.8, '2020-03-23', NOW(), NOW()),
('Resident Evil 7: Biohazard VR', 'VR horror. Experience biohazard terror in first-person virtual reality.', 'Horror', 'PlayStation VR', 49.99, 4.5, '2017-01-24', NOW(), NOW());
" && echo "✅ Games seeded successfully!" || echo "❌ Error seeding games"

# Count the inserted games
echo ""
echo "📊 Game Count:"
run_sql "SELECT COUNT(*) as total_games FROM games;"

echo ""
echo "🎮 Sample Games:"
run_sql "SELECT id, title, genre, platform, price, rating FROM games ORDER BY id LIMIT 10;"

echo ""
echo "✨ Database seeding complete!"
