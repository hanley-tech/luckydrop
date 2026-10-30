# LuckyDrop Halloween audio pack: credits and licenses

Every file in this folder comes from public-domain, CC0, or CC BY sources. I checked each license on the source page on 2026-10-29. All files are 128 kbps MP3 at 44.1 kHz: music is stereo and SFX are mono. Music is normalized to about -12.5 LUFS integrated and SFX to about -14.5 LUFS, and every file's sample peak is at or below -1.8 dBFS. Processing used ffmpeg: trimming, fades, compression/limiting, gain, and for some SFX, layering several sources.

## Required attribution (CC BY)

Display this text wherever the game credits its media (an About page, the README, or a credits screen):

> "Graveyard Shift" and "Danse Macabre" by Kevin MacLeod (incompetech.com)
> Licensed under Creative Commons: By Attribution 3.0 License
> https://creativecommons.org/licenses/by/3.0/
>
> "Toccata und Fuge d-moll, BWV 565" (J. S. Bach), organ recording by Norbert Schenk, CC BY 4.0
> https://creativecommons.org/licenses/by/4.0/ (excerpt, layered with thunder)

The other sources below are CC0 or public domain and need no attribution. They are credited anyway.

---

## Music

### lobby.mp3: "Graveyard Shift" by Kevin MacLeod
- Author: Kevin MacLeod (incompetech.com)
- Source: https://commons.wikimedia.org/wiki/File:Graveyard_Shift_(ISRC_USUAN1700044).mp3 (original: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700044)
- License: Creative Commons Attribution 3.0 Unported (CC BY 3.0), https://creativecommons.org/licenses/by/3.0/
- Changes: kept 0:00.0–3:14.5 (the whole piece, with the 2.7 s of trailing silence removed). Added a 20 ms fade-in and a 1.5 s fade-out at the natural final decay. Applied gain and a peak limiter. Length 3:14.5.

### game.mp3: "In the Hall of the Mountain King" (Grieg, Peer Gynt Suite No. 1, Op. 46, IV), Musopen Symphony Orchestra
- Composer: Edvard Grieg (died 1907). Performer: Musopen Symphony (Czech National Symphony Orchestra, recorded for the Musopen Kickstarter project, 2012)
- Source: https://commons.wikimedia.org/wiki/File:Grieg_-_Peer_Gynt_Suite_No._1,_Op._46_-_IV._In_the_Hall_of_the_Mountain_King_(Musopen_Symphony).flac (original: https://musopen.org/music/777-peer-gynt-suite-no-1-op-46/)
- License: Public domain. Recording: PD-author (Musopen released it into the public domain). Composition: PD-old-auto-expired. See https://creativecommons.org/publicdomain/mark/1.0/
- Changes: kept 0:00.5–2:32.2 (the whole movement, with leading and trailing silence removed). Applied dynaudnorm (31-frame Gaussian window, max gain 12) to lift the very quiet pizzicato opening so it can be heard in a loud room while the crescendo still builds. Added a 50 ms fade-in and a 1.3 s fade-out on the final chord's decay. Applied gain and a peak limiter. Length 2:31.7.

### winner.mp3: "Danse Macabre" (Saint-Saëns), arranged/performed by Kevin MacLeod
- Composer: Camille Saint-Saëns. Recording: Kevin MacLeod (incompetech.com)
- Source: https://commons.wikimedia.org/wiki/File:Danse_Macabre_(ISRC_USUAN1100546).mp3 (original: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100546)
- License: Creative Commons Attribution 3.0 Unported (CC BY 3.0), https://creativecommons.org/licenses/by/3.0/
- Changes: kept 3:40.4–5:59.0 (the build into the full-orchestra climax, ending as the climax chord decays and before the quiet "dawn" coda). Applied light dynaudnorm, a 3:1 compressor, gain, and a peak limiter. Added a 0.3 s fade-in and a 1.6 s fade-out. Length 2:18.6.

### transition.mp3: Toccata opening sting with thunder
- Organ: J. S. Bach, Toccata und Fuge d-moll BWV 565, performed by Norbert Schenk (Evangelische Kirche Solms-Albshausen, 2017)
  - Source: https://commons.wikimedia.org/wiki/File:Bach,_Toccata_und_Fuge_d-moll_BWV_565,_Norbert_Schenk.mp3
  - License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ (permission verified by Wikimedia VRT ticket 2020041810006148)
- Thunder: "Thunder #3", Joseph Sardin / BigSoundBank, sound #3114
  - Source: https://bigsoundbank.com/thunder-3-s3114.html
  - License: CC0 1.0 Universal (public domain), https://creativecommons.org/publicdomain/zero/1.0/ (also see https://bigsoundbank.com/droit.html)
- Changes: kept organ 0:00.25–0:04.15 (the famous opening mordent and descending run). Mixed thunder 0:00–0:03.9 under it at -9 dB. Added a 15 ms fade-in, a 0.6 s fade-out on the organ, and a 1.0 s fade-out on the thunder. Applied two-pass loudnorm. Length 3.9 s.

## Sound effects

All BigSoundBank sounds are by Joseph Sardin (some co-recorded with Axeline T.). On every sound page I used, BigSoundBank shows "CC0 (public domain): Free and royalty-free". License: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/. Site rights page: https://bigsoundbank.com/droit.html

### player-joined.mp3: witch cackle
- Source: "Strident Laughter" (described as "Laugh at a witch for example, 2 times"), BigSoundBank #0489, https://bigsoundbank.com/strident-laughter-s0489.html
- License: CC0 1.0
- Changes: kept the first cackle, 0:00.15–0:02.05. Added a short two-tap echo (70/140 ms), a 15 ms fade-in, and a 0.4 s fade-out. Downmixed to mono, applied gain and a limiter. Length about 1.9 s.

### game-start.mp3: thunderclap
- Source: "Thunder #2" ("A single short thunderclap, without rain"), BigSoundBank #3113, https://bigsoundbank.com/thunder-2-s3113.html
- License: CC0 1.0
- Changes: kept 0:01.0–0:03.0, the crack plus the start of the rumble. Added a 20 ms fade-in and a 0.6 s fade-out. Downmixed to mono, applied gain and a limiter. Length 2.0 s.

### ball-center.mp3: magic sparkle and evil laugh
- Sparkle: "Chimes 'Dream' #8", BigSoundBank #2086, https://bigsoundbank.com/chimes-dream-8-s2086.html (CC0 1.0)
- Laugh: "Delirious Laughter #3", BigSoundBank #2093, https://bigsoundbank.com/delirious-laughter-3-s2093.html (CC0 1.0)
- Changes: chimes 0:00–0:02.5 at -2 dB. Laugh 0:00.4–0:03.4, with a two-tap echo (90/180 ms), starting 0.35 s in. Mixed together, trimmed to 3.0 s, with a 15 ms fade-in and a 0.5 s fade-out. Downmixed to mono, applied gain and a limiter.

### round-complete.mp3: single church-bell toll
- Source: "Bell 1 O'clock" (church tower of La Loupe striking one), BigSoundBank #3446, https://bigsoundbank.com/bell-1-o-clock-s3446.html
- License: CC0 1.0
- Changes: kept 0:00.05–0:01.35 (one strike). Added a 10 ms fade-in and a 0.45 s fade-out over the decay. Downmixed to mono, applied gain and a limiter. Length 1.3 s.

### retry.mp3: creaking door
- Source: "Creaking Door #1", BigSoundBank #0302, https://bigsoundbank.com/creaking-door-s0302.html
- License: CC0 1.0
- Changes: used the whole file (0:00–0:01.24). Added a 10 ms fade-in and a 0.24 s fade-out. Downmixed to mono, applied gain and a limiter. Length 1.24 s.

### power-up.mp3: bubbling cauldron, whoosh, and sparkle
- Bubbling: "Big broth in a pot", BigSoundBank #0491, https://bigsoundbank.com/big-broth-in-a-pot-s0491.html (CC0 1.0)
- Whoosh: "Whoosh #4" (long rope), BigSoundBank #1796, https://bigsoundbank.com/whoosh-4-s1796.html (CC0 1.0)
- Sparkle: "Chimes 'Dream' #1", BigSoundBank #2079, https://bigsoundbank.com/chimes-dream-1-s2079.html (CC0 1.0)
- Changes: bubbling 0:00.4–0:02.2 (0.25 s fade-in, 0.5 s fade-out). Whoosh 0:00.15–0:00.75 starting at 0.15 s. Chimes 0:00.25–0:01.6 at -5 dB, starting at 0.5 s. Mixed together, trimmed to 1.8 s, with a 15 ms fade-in and a 0.3 s fade-out. Downmixed to mono, applied gain and a limiter.

### winner-cheers.mp3: thunder and wolf howl into a cheering crowd
- Thunder: "Thunder #3", BigSoundBank #3114, https://bigsoundbank.com/thunder-3-s3114.html (CC0 1.0)
- Wolves: "Wolf howls", U.S. Fish and Wildlife Service, https://commons.wikimedia.org/wiki/File:Wolf_howls.ogg. License: public domain as a work of the U.S. federal government (PD-USGov-FWS), https://creativecommons.org/publicdomain/mark/1.0/
- Shout: "Shouts and Applauses of Teens #1" (teens shouting "Yeah!"), BigSoundBank #0236, https://bigsoundbank.com/shouts-and-applauses-of-teens-1-s0236.html (CC0 1.0)
- Applause: "Applause: 600 People", BigSoundBank #0021, https://bigsoundbank.com/applause-600-people-s0021.html (CC0 1.0)
- Changes: thunder 0:00–0:06 at -3 dB with a 1.5 s fade-out. Wolves 0:02.7–0:08.7 at +6 dB, starting at 0.3 s, with a 0.3 s fade-in and a 1.5 s fade-out. Teens' "Yeah" 0:00.05–0:03.3, starting at 4.2 s. Applause 0:03.0–0:14.0 at -6 dB, starting at 4.0 s, with a 0.6 s fade-in and a 2.5 s fade-out. Mixed together and trimmed to 15.0 s. Downmixed to mono, applied gain and a limiter.
