/*
 * Dữ liệu vòng "Vượt chướng ngại vật".
 * Nguồn nội dung: Google Doc "Nội dung", tab "nội dung có kèm ảnh".
 * Đồng bộ với cau-hoi-vuot-chuong-ngai-vat.md và dap-an-mc.md.
 *
 * Lưu ý: chỉ đặt ở đây những gì được phép CHIẾU lên màn hình.
 * Đáp án chấp nhận / không chấp nhận chỉ nằm trong phiếu MC.
 */
window.VCNV_DATA = {
  topic: 'Đường lối đối ngoại thời kỳ đổi mới',

  timerSeconds: 15,

  // Các đội mặc định. Nhóm 7 là nhóm thuyết trình nên không thi.
  // key = phím số để MC chấm nhanh (Nhóm 10 dùng phím 0).
  teams: [
    { name: 'Nhóm 1', key: '1' },
    { name: 'Nhóm 2', key: '2' },
    { name: 'Nhóm 3', key: '3' },
    { name: 'Nhóm 4', key: '4' },
    { name: 'Nhóm 5', key: '5' },
    { name: 'Nhóm 6', key: '6' },
    { name: 'Nhóm 8', key: '8' },
    { name: 'Nhóm 9', key: '9' },
    { name: 'Nhóm 10', key: '0' }
  ],

  scoring: {
    // Điểm hàng ngang nằm ở từng row.points
    cnvBase: 50,           // điểm CNV khi chưa mở gợi ý nào
    cnvPenaltyPerHint: 5,  // trừ cho mỗi gợi ý đã mở
    cnvMin: 20             // điểm CNV thấp nhất
  },

  cnv: {
    syllables: 4,
    letterCount: 11,
    // Chỉ được đưa vào DOM SAU KHI CNV được giải / công bố.
    answer: 'ĐỘC LẬP TỰ CHỦ',
    boardLetters: ['DOC', 'LAP', 'TU', 'CHU'],
    explanation:
      'Độc lập, tự chủ là nguyên tắc nền tảng, xuyên suốt – là “gốc” của đường lối đối ngoại; ' +
      'đa phương hóa, đa dạng hóa là “cách làm”. ' +
      '“Độc lập, tự chủ giúp Việt Nam hội nhập vững vàng. Hội nhập giúp Việt Nam tự chủ mạnh mẽ hơn.”'
  },

  rows: [
    {
      difficulty: 'Dễ',
      points: 10,
      question:
        'Khái niệm nào được giải thích là “mở rộng quan hệ đối ngoại với nhiều quốc gia, tổ chức và cơ chế quốc tế; tích cực tham gia các diễn đàn khu vực, toàn cầu”?',
      answer: 'Đa phương hóa',
      explanation:
        'Ví dụ trong bài: Việt Nam gia nhập ASEAN (1995), APEC (1998), WTO (2007) và tham gia tích cực hoạt động của Liên hợp quốc.',
      source: '§3.2 – Đa phương hóa',
      media: {
        image: 'img/q1-asean-1995.jpg',
        caption: 'Ảnh: Ngoại trưởng Nguyễn Mạnh Cầm ký tuyên bố kết nạp Việt Nam vào ASEAN tại Brunei (28/7/1995) – Nguồn: Mekong ASEAN',
        url: 'https://mekongasean.vn/30-nam-gia-nhap-asean-anh-le-ket-nap-viet-nam-tai-brunei-nam-1995-44118.html'
      },
      hint: {
        level: 'Rất gián tiếp',
        text:
          'Năm 1986, Việt Nam buộc phải mở rộng quan hệ để thoát khủng hoảng, phá thế bao vây. Nhưng bài nhấn mạnh: mở rộng quan hệ phải đi đôi với việc giữ vững điều này.'
      }
    },
    {
      difficulty: 'Dễ',
      points: 10,
      question:
        'Đường lối đối ngoại thời kỳ đổi mới hướng đến 3 mục tiêu: Bảo vệ Tổ quốc, Phát triển đất nước và mục tiêu thứ ba là gì?',
      answer: 'Nâng cao vị thế quốc gia',
      explanation:
        'Xây dựng hình ảnh Việt Nam là đối tác tin cậy, thành viên tích cực, có trách nhiệm của cộng đồng quốc tế.',
      source: '§3.1 – Khái quát đường lối đối ngoại',
      media: {
        image: 'img/q2-apec-2017.jpg',
        caption: 'Ảnh: Các nhà lãnh đạo APEC tại Đà Nẵng trên đường ra chụp ảnh chung – Việt Nam đăng cai APEC 2017 – Nguồn: Dân trí',
        url: 'https://dantri.com.vn/apec-viet-nam-2017/cac-lanh-dao-apec-chup-anh-luu-niem-chung-tai-da-nang-20171111161109574.htm'
      },
      hint: {
        level: 'Gián tiếp',
        text:
          'Việt Nam hợp tác với cả Hoa Kỳ, Trung Quốc, Nhật Bản, Nga, ASEAN… “trên cơ sở lợi ích và nguyên tắc của mình, thay vì chỉ phụ thuộc vào một nước” – bài dùng ví dụ này để minh họa cho nó.'
      }
    },
    {
      difficulty: 'Trung bình',
      points: 20,
      question:
        'Tấm “phiếu mua vải” trong bài là hình ảnh tiêu biểu của cơ chế nào – cơ chế đã bộc lộ nhiều hạn chế trước Đại hội VI?',
      answer: 'Cơ chế tập trung quan liêu, bao cấp',
      explanation:
        'Cơ chế này đòi hỏi phải đổi mới toàn diện; Đại hội VI (12/1986) xác định đổi mới là yêu cầu cấp thiết để đưa đất nước thoát khỏi khủng hoảng.',
      source: '§1.2 – Khó khăn trong nước và quan hệ đối ngoại',
      media: {
        image: 'img/q3-phieu-mua-vai.jpg',
        caption: 'Ảnh: Phiếu mua vải – một loại tem phiếu phân phối hàng hóa thời bao cấp – Nguồn: Kenh14',
        url: 'https://kenh14.vn/kham-pha/chum-anh-tem-phieu-xep-hang-thoi-bao-cap-20120428072248571.chn'
      },
      hint: {
        level: 'Vừa phải',
        text:
          'Biểu hiện của nó: giữ quyền tự quyết trong quan hệ quốc tế; hợp tác bình đẳng, cùng có lợi; không đánh đổi lợi ích cốt lõi của quốc gia để lấy lợi ích kinh tế trước mắt.'
      }
    },
    {
      difficulty: 'Trung bình',
      points: 20,
      question:
        'Việt Nam từng 2 lần giữ cương vị này – năm 2010 và năm 2020. Hiệp định RCEP cũng được ký đúng năm Việt Nam giữ cương vị ấy. Đó là cương vị gì?',
      answer: 'Chủ tịch ASEAN',
      explanation: 'Hiệp định RCEP được ký ngày 15/11/2020 – trong năm Việt Nam làm Chủ tịch ASEAN.',
      source: '§4.3 – Về vị thế quốc tế',
      media: {
        image: 'img/q4-rcep-2020.jpg',
        caption: 'Ảnh: Lễ ký Hiệp định RCEP (15/11/2020) trong năm Việt Nam làm Chủ tịch ASEAN – Nguồn: TTXVN',
        url: 'https://vnanet.vn/vi/anh/anh-thoi-su-trong-nuoc-1014/asean-2020-le-ky-hiep-dinh-doi-tac-kinh-te-toan-dien-khu-vuc-rcep-5133646.html'
      },
      hint: {
        level: 'Cụ thể hơn',
        text:
          'Nó là việc Việt Nam tự quyết định đường lối, chính sách đối ngoại của mình, không để bị áp đặt hoặc phụ thuộc vào bất kỳ quốc gia hay thế lực bên ngoài nào.'
      }
    },
    {
      difficulty: 'Khó',
      points: 30,
      question:
        'Nếu chặng 1995–2010 tập trung vào hội nhập KINH TẾ quốc tế, thì từ năm 2011 hội nhập của Việt Nam chuyển sang hình thức nào? Kể thêm ít nhất 2 lĩnh vực được mở rộng.',
      answer: 'Hội nhập quốc tế toàn diện',
      explanation:
        'Bước chuyển tư duy thứ ba: “từ hội nhập kinh tế sang hội nhập quốc tế toàn diện” – mở rộng sang chính trị, quốc phòng, an ninh, giáo dục, khoa học, văn hóa.',
      source: '§4.1 – Ba chặng đường; §4.2 – “Ba là…”',
      media: {
        image: 'img/q5-nam-sudan.jpg',
        caption: 'Ảnh: Bệnh viện dã chiến Việt Nam tại Nam Sudan nhận Huy chương gìn giữ hòa bình LHQ – hội nhập mở rộng sang lĩnh vực quốc phòng – Nguồn: Báo Quân đội nhân dân',
        url: 'https://www.qdnd.vn/chinh-tri/tin-tuc/benh-vien-da-chien-viet-nam-tai-ch-nam-sudan-duoc-trao-huy-chuong-vi-su-nghiep-gin-giu-hoa-binh-lien-hop-quoc-649948'
      },
      hint: {
        level: 'Mạnh',
        text:
          'Trong ba nội dung của đường lối, đây là “nền tảng và nguyên tắc xuyên suốt”; còn đa phương hóa và đa dạng hóa là “phương thức thực hiện” nó.'
      }
    },
    {
      difficulty: 'Khó',
      points: 30,
      question:
        'Tình huống: hai nước lớn cạnh tranh gay gắt, bên nào cũng muốn kéo Việt Nam về phía mình. Theo bài, Việt Nam KHÔNG để mình bị lôi kéo, phụ thuộc vào loại liên kết nào?',
      answer: 'Các liên minh quân sự',
      explanation:
        'Nhờ mạng lưới đối ngoại đa phương hóa, đa dạng hóa, Việt Nam xử lý khôn khéo quan hệ đan xen lợi ích với các nước lớn, bảo vệ lợi ích quốc gia – dân tộc dựa trên luật pháp quốc tế.',
      source: 'Sự thay đổi vị thế Việt Nam – Bảo vệ vững chắc chủ quyền',
      media: {
        image: 'img/q6-truong-sa.jpg',
        caption: 'Ảnh: Cột mốc chủ quyền trên quần đảo Trường Sa – Nguồn: VietnamPlus',
        url: 'https://www.vietnamplus.vn/cot-moc-chu-quyen-bieu-tuong-thieng-lieng-o-quan-dao-truong-sa-post1036566.vnp'
      },
      hint: {
        level: 'Gần như lộ rõ',
        text:
          'Trong hình ảnh “ngoại giao cây tre Việt Nam” (vững gốc – chắc thân – uyển chuyển cành), nó chính là phần GỐC. Câu chốt của bài: “______ giúp Việt Nam hội nhập vững vàng.”'
      }
    }
  ]
};
