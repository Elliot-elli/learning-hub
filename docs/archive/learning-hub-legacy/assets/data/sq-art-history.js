// 题库数据（由 tools/extract.py 从源文件逐字抽取）
// e 是源文件里就有的解析字段，当前 UI 未渲染，保留原样不删
window.AP_MODULES = window.AP_MODULES || {};
window.AP_MODULES['sq-art-history'] = {
  id: 'sq-art-history',
  type: 'sq',
  title: 'Art history',
  subject: 'Art history',
  timerSeconds: 10,
  questions: [
    { q: 'Art history is primarily concerned with', o: ['making art look attractive', 'studying the social setting of art', 'selling art to collectors', 'preserving old buildings'], a: 1, e: 'Art history reads artworks as evidence of the society that produced them.' },
    { q: 'A basic goal of art history is to understand', o: ['art prices in galleries', 'how to copy styles exactly', 'art in its original time', 'museum display choices'], a: 2, e: 'History asks what an artwork meant when it was first made.' },
    { q: 'Art history is closely related to which of the following?', o: ['chemistry and physics', 'anthropology, history, and sociology', 'engineering and medicine', 'math and coding'], a: 1 },
    { q: 'Aesthetics MOST clearly means the', o: ['study of museum rules', 'study of color theory', 'market value of art', 'philosophy of beauty'], a: 3, e: 'Aesthetics is the branch of philosophy dealing with beauty.' },
    { q: 'Art critics mainly', o: ['repair damaged artworks', 'explain art news to the public', 'appraise art for buyers', 'teach art studio classes'], a: 1 },
  ]
};
