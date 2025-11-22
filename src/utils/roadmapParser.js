// src/utils/roadmapParser.js

export function parseRoadmap(text, teamMembers) {
  const lines = text.split('\n');
  const tasks = [];

  lines.forEach(line => {
    let cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('//') || cleanLine.length < 3) return;

    let assignedUser = null;
    let priority = 'medium';
    let tags = []; // YENİ: Etiket Dizisi

    // 1. Kullanıcı Tespiti (@username)
    for (const member of teamMembers) {
      const tag = `@${member.username}`;
      if (cleanLine.toLowerCase().includes(tag.toLowerCase())) {
        assignedUser = member;
        cleanLine = cleanLine.replace(new RegExp(tag, 'gi'), '');
        break; 
      }
    }
    if (!assignedUser && teamMembers.length > 0) assignedUser = teamMembers[0]; 

    // 2. Öncelik Tespiti
    if (cleanLine.match(/\((high|yüksek|acil)\)/i)) {
      priority = 'high';
      cleanLine = cleanLine.replace(/\((high|yüksek|acil)\)/i, '');
    } else if (cleanLine.match(/\((low|düşük)\)/i)) {
      priority = 'low';
      cleanLine = cleanLine.replace(/\((low|düşük)\)/i, '');
    }

    // 3. YENİ: Hashtag Tespiti (#network, #db vb.)
    const hashtagMatch = cleanLine.match(/#[\wçğıöşü]+/gi);
    if (hashtagMatch) {
      tags = hashtagMatch.map(t => t.replace('#', '')); // '#' işaretini kaldırıp kaydet
      // Tagleri başlıktan sil (Temiz görünüm için)
      hashtagMatch.forEach(tag => {
        cleanLine = cleanLine.replace(tag, '');
      });
    }

    // 4. Başlık Temizliği
    let title = cleanLine.replace(/^[-*•\d.]+\s*/, '').trim();

    if (title) {
      tasks.push({
        title: title,
        assigned_to_uid: assignedUser.uid,
        assigned_to_username: assignedUser.username,
        priority: priority,
        tags: tags, // Kaydediyoruz
        notes: "", // YENİ: Basit not alanı
        due_date: null, // YENİ: Son tarih
        status: 'todo',
        created_at: new Date().toISOString()
      });
    }
  });

  return tasks;
}