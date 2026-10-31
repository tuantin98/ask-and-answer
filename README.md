# Ask & Answer – Real-time Q&A / Quiz App

Ứng dụng thi trả lời câu hỏi thời gian thực (lấy cảm hứng từ Buzzin.live), cho phép người chơi gửi **câu trả lời dạng văn bản**. Server đo thời gian phản ứng tính từ lúc Host bấm "Mở câu hỏi".

- **Backend:** Node.js + Express + Socket.io
- **Frontend:** HTML/CSS/JavaScript thuần (không cần build)
- **Dữ liệu:** lưu trong bộ nhớ server (mất khi tắt server)

## Cài đặt & chạy

Yêu cầu: Node.js 18 trở lên (kiểm tra bằng `node -v`).

```bash
npm install
```

```bash
npm start
```

(tương đương `node server.js`; dùng `npm run dev` để tự khởi động lại khi sửa code)

Mở trình duyệt:

| Vai trò | Địa chỉ |
|---|---|
| Host (người ra đề) | http://localhost:3000/host |
| Player (người chơi) | http://localhost:3000/ |

Đổi cổng: `PORT=4000 npm start` (PowerShell: `$env:PORT=4000; npm start`).

### Chơi với điện thoại cùng mạng Wi-Fi
1. Xem IP máy tính: `ipconfig` (Windows) → dòng *IPv4 Address*, ví dụ `192.168.1.10`.
2. Người chơi mở `http://192.168.1.10:3000/` (có thể gửi link `http://192.168.1.10:3000/?room=MÃPHÒNG` để điền sẵn mã).
3. Nếu không vào được, cho phép Node.js qua Windows Firewall.

## Cách chơi
1. Host mở `/host` → bấm **TẠO PHÒNG** → đọc mã phòng cho người chơi.
2. Người chơi nhập mã phòng + họ tên → **VÀO PHÒNG**. Ô trả lời bị khóa, hiển thị "Đang chờ Host mở câu hỏi...".
3. Host đọc câu hỏi rồi bấm **MỞ CÂU HỎI** → ô trả lời của người chơi được mở.
4. Người chơi nhập đáp án, bấm **GỬI** hoặc Enter → ô khóa lại, hiện "Đã gửi thành công! Thời gian: X.XX giây". Mỗi người chỉ gửi 1 lần/câu.
5. Màn hình Host hiện câu trả lời ngay lập tức, người nhanh nhất ở trên cùng.
6. **KHÓA / DỪNG** để ngừng nhận đáp án; **XÓA LƯỢT** để xóa danh sách và chờ câu tiếp theo. (Bấm **MỞ CÂU HỎI** lần nữa cũng bắt đầu câu mới.)

Host hoặc người chơi tải lại trang vẫn tự động vào lại phòng cũ. Phòng bị xóa sau 10 phút nếu Host rời đi.

## Cấu trúc thư mục

```
├── server.js            # Express + Socket.io, toàn bộ logic phòng/lượt chơi
├── package.json
└── public/
    ├── index.html       # Giao diện Player  (/)
    ├── host.html        # Giao diện Host    (/host)
    ├── css/style.css
    └── js/
        ├── player.js
        └── host.js
```

## Các sự kiện Socket.io

| Sự kiện | Chiều | Mô tả |
|---|---|---|
| `host:create` | Host → Server | Tạo phòng, trả về mã phòng |
| `host:rejoin` | Host → Server | Lấy lại phòng sau khi tải lại trang |
| `host:start` | Host → Server | Mở câu hỏi: lưu `startTime = Date.now()`, xóa đáp án cũ |
| `host:lock` | Host → Server | Khóa, không nhận đáp án nữa |
| `host:reset` | Host → Server | Xóa đáp án, về trạng thái chờ |
| `player:join` | Player → Server | Vào phòng với mã + tên (tên không được trùng) |
| `player:answer` | Player → Server | Gửi đáp án; server tính `responseTime = (Date.now() - startTime) / 1000` |
| `round:state` | Server → Players | Trạng thái lượt: `idle` / `open` / `locked` |
| `host:answer` | Server → Host | Một đáp án mới (đẩy ngay khi nhận) |
| `host:snapshot` | Server → Host | Toàn bộ trạng thái phòng |
| `host:players` | Server → Host | Danh sách người chơi đang online |
| `room:closed` | Server → Players | Phòng đã đóng |

Thời gian phản ứng do **server** tính, nên không phụ thuộc đồng hồ máy người chơi và không thể gian lận từ phía client. Thời gian này có bao gồm độ trễ mạng của từng người chơi.
