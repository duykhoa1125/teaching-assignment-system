# Git Flow

## 1. Cấu trúc branch

```text
main        # phiên bản ổn định
dev         # branch tích hợp

feat/*      # tính năng mới
fix/*       # sửa lỗi
docs/*      # thay đổi tài liệu
refactor/*  # tái cấu trúc, không đổi hành vi
test/*      # bổ sung hoặc sửa kiểm thử
chore/*     # công việc bảo trì, cấu hình
hotfix/*    # lỗi khẩn cấp của phiên bản đã phát hành
```

Ví dụ:

```text
feat/auth
feat/teacher
feat/assignment

fix/login
fix/teacher-api

docs/update-analysis
refactor/assignment-service
test/workload-policy
chore/update-dependencies
```

Flow chính:

```text
feat/* ──┐
fix/*  ──┼──> dev ───> main
         ┘
```

Quy tắc:

* Không code trực tiếp trên `main`.
* Không code trực tiếp trên `dev`.
* Task mới → tạo branch mới từ `dev`.
* `feat/*`, `fix/*`, `docs/*`, `refactor/*`, `test/*`, `chore/*` → Pull Request vào `dev`.
* `dev` ổn định → Pull Request vào `main`.
* Chỉ rebase branch cá nhân, không rebase `dev` hoặc `main`.
* `hotfix/*` chỉ dùng khi đã có phiên bản phát hành; tạo từ `main`, merge vào `main`, sau đó đồng bộ thay đổi trở lại `dev`.
* Không dùng chung một feature branch cho nhiều thành viên nếu không thật sự cần thiết.

Tên branch dùng chữ thường, dấu gạch ngang và mô tả ngắn:

```text
feat/teacher-management
fix/duplicate-teacher-code
docs/update-project-scope
```

---

# 2. Setup ban đầu

Clone repo:

```bash
git clone <repo-url>
cd <project>
```

Tạo `dev`:

```bash
git checkout -b dev
git push -u origin dev
```

Các thành viên khác:

```bash
git clone <repo-url>
cd <project>

git checkout dev
git pull origin dev
```

Trên GitHub nên bật Branch Protection cho:

```text
main
dev
```

Thiết lập bắt buộc:

```text
Require pull request before merging
Require at least 1 approval
Dismiss stale approvals when new commits are pushed
Require conversation resolution before merging
Require branches to be up to date before merging
Block force pushes
Block branch deletion
```

Khi CI được thiết lập, bổ sung:

```text
Require status checks to pass before merging
```

Không cấu hình status check bắt buộc trước khi workflow CI tương ứng tồn tại, vì điều đó có thể làm mọi Pull Request bị khóa.

### Chiến lược merge thống nhất

```text
feat/*, fix/*, docs/*, refactor/*, test/*, chore/* → dev
    Dùng Squash and merge

dev → main
    Dùng Create a merge commit
```

Lý do:

* Squash giữ lịch sử `dev` gọn, mỗi task tương ứng một commit hoàn chỉnh.
* Merge commit từ `dev` sang `main` đánh dấu rõ ranh giới của mỗi đợt phát hành.
* Tắt `Rebase and merge` trên GitHub để tránh ba thành viên chọn ba cách khác nhau.
* Bật tự động xóa source branch sau khi merge nếu repository hỗ trợ.

---

# 3. Bắt đầu task mới

Luôn cập nhật `dev` trước:

```bash
git checkout dev
git pull origin dev
```

Tạo branch mới:

```bash
git checkout -b feat/teacher
```

Hoặc sửa bug:

```bash
git checkout -b fix/login
```

Không tạo feature mới từ một feature cũ.

Nếu cần chia sẻ công việc chưa hoàn thành, push branch cá nhân và mở **Draft Pull Request**. Không merge Pull Request còn ở trạng thái Draft.

---

# 4. Trong lúc code

Kiểm tra:

```bash
git status
```

Commit:

```bash
git add .
git commit -m "feat: add teacher management"
```

Có thể commit nhiều lần:

```bash
git commit -m "feat: add teacher entity"
git commit -m "feat: add teacher service"
git commit -m "fix: validate teacher email"
```

Push lần đầu:

```bash
git push -u origin feat/teacher
```

Các lần sau:

```bash
git push
```

---

# 5. Cập nhật code mới từ `dev`

Trong lúc bạn đang làm, người khác có thể đã merge code mới vào `dev`.

Trước khi tạo PR nên cập nhật lại:

```bash
git checkout dev
git pull origin dev

git checkout feat/teacher
git rebase dev
```

Nếu không có conflict thì tiếp tục.

Nếu branch chưa từng push:

```bash
git push
```

Nếu branch đã push trước khi rebase:

```bash
git push --force-with-lease
```

Không dùng:

```bash
git push --force
```

trừ khi thật sự hiểu rõ mình đang làm gì.

---

# 6. Khi rebase gặp conflict

Ví dụ:

```bash
git rebase dev
```

Git báo conflict.

Trong file sẽ có:

```text
<<<<<<< HEAD
code từ dev
=======
code của bạn
>>>>>>> commit
```

Sửa lại thành code đúng và xóa các dấu conflict.

Sau đó:

```bash
git add .
git rebase --continue
```

Nếu còn conflict thì tiếp tục sửa.

Nếu muốn hủy rebase:

```bash
git rebase --abort
```

Sau khi rebase hoàn tất:

```bash
git push --force-with-lease
```

---

# 7. Nếu không muốn dùng rebase

Có thể dùng merge:

```bash
git checkout dev
git pull origin dev

git checkout feat/teacher
git merge dev
```

Nếu conflict:

```bash
git add .
git commit -m "fix: resolve merge conflict"
git push
```

Tuy nhiên nhóm nên thống nhất một cách.

Khuyến nghị:

```text
Branch cá nhân cập nhật từ dev → rebase
PR vào dev → merge trên GitHub
```

---

# 8. Nếu đang code dở nhưng cần pull

Nếu code đã đủ để commit:

```bash
git add .
git commit -m "chore: checkpoint local work"
```

Nếu chưa muốn commit:

```bash
git stash
```

Sau đó có thể:

```bash
git checkout dev
git pull origin dev
```

Quay lại:

```bash
git checkout feat/teacher
git stash pop
```

Nếu `stash pop` gây conflict thì xử lý giống conflict bình thường.

Commit checkpoint chỉ được dùng trên branch cá nhân. Trước khi merge, các commit tạm sẽ được gom lại bởi `Squash and merge`; tiêu đề Pull Request phải tuân thủ Conventional Commits.

---

# 9. Tạo Pull Request

Trước PR:

```bash
git checkout dev
git pull origin dev

git checkout feat/teacher
git rebase dev

git push --force-with-lease
```

Sau đó tạo PR:

```text
feat/teacher
     ↓
    dev
```

Không:

```text
feat/teacher
     ↓
    main
```

Ví dụ:

```text
Title:
feat: add teacher management

Description:
- Add teacher CRUD
- Add validation
- Add teacher service
- Add teacher API
```

Quy tắc Pull Request:

* Tác giả tự kiểm tra diff và `git status` trước khi yêu cầu review.
* Không đưa mật khẩu, token, file `.env` hoặc dữ liệu thật chưa ẩn danh vào Pull Request.
* Ít nhất một thành viên khác review và approve.
* Tác giả phải xử lý hoặc phản hồi tất cả nhận xét.
* Tất cả conversation phải được resolve.
* Khi CI đã có, mọi check bắt buộc phải xanh.
* Không tự approve Pull Request của chính mình.
* Pull Request nhỏ, tập trung vào một mục tiêu; tránh trộn refactor không liên quan.

Sau khi đủ điều kiện, dùng `Squash and merge` vào `dev`.

---

# 10. Sau khi PR được merge

Cập nhật local:

```bash
git checkout dev
git pull origin dev
```

Xóa branch cũ:

```bash
git branch -d feat/teacher
```

Nếu remote branch chưa bị GitHub xóa:

```bash
git push origin --delete feat/teacher
```

Task tiếp theo:

```bash
git checkout dev
git pull origin dev

git checkout -b feat/assignment
```

---

# 11. Đưa `dev` lên `main`

Khi các chức năng đã ổn định và test xong:

```text
dev
 ↓
main
```

Tạo PR:

```text
dev → main
```

Review + test rồi merge.

Sau đó:

```bash
git checkout main
git pull origin main
```

Có thể tạo version:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Quy tắc phát hành:

* Chỉ tạo tag trên commit thuộc `main`.
* Dùng Semantic Versioning: `vMAJOR.MINOR.PATCH`.
* Ghi chú phát hành phải nêu tính năng, lỗi đã sửa và thay đổi cần lưu ý.
* Không sửa hoặc di chuyển một tag đã được đẩy lên remote.

---

# 12. Commit convention

```text
feat: tính năng mới
fix: sửa lỗi
refactor: chỉnh lại code
docs: tài liệu
test: test
chore: config/dependency
perf: cải thiện hiệu năng
build: hệ thống build hoặc dependency
ci: cấu hình CI/CD
```

Ví dụ:

```text
feat: add login API
feat: add teacher management
fix: prevent duplicate email
refactor: simplify assignment service
docs: update README
```

Có thể thêm scope khi hữu ích:

```text
feat(teacher): add teacher management
fix(workload): prevent negative teaching norm
docs(git): clarify merge strategy
```

Quy tắc commit:

* Dùng câu ngắn ở thể mệnh lệnh, không kết thúc bằng dấu chấm.
* Mỗi commit phải có một mục đích rõ ràng.
* Không commit secret, file build, IDE cache hoặc dữ liệu cá nhân thật.
* Tiêu đề Pull Request phải dùng cùng convention vì feature branch được squash khi merge.

---

# 13. Workflow chuẩn mỗi task

```text
1. Cập nhật dev

git checkout dev
git pull origin dev


2. Tạo branch

git checkout -b feat/xxx


3. Code


4. Commit

git add .
git commit -m "feat: ..."


5. Push

git push -u origin feat/xxx


6. Trước khi PR, cập nhật dev

git checkout dev
git pull origin dev

git checkout feat/xxx
git rebase dev


7. Nếu conflict

Sửa conflict

git add .
git rebase --continue


8. Push lại

git push --force-with-lease


9. Tạo PR

feat/xxx → dev


10. Review + Merge


11. Sau khi merge

git checkout dev
git pull origin dev

git branch -d feat/xxx


12. Khi dev ổn định

PR:

dev → main
```

---

# 14. Quy tắc nhóm

```text
main = stable
dev  = integration

Không push trực tiếp main.
Không code trực tiếp dev.

Task mới → branch mới từ dev.

feat/* → dev
fix/*  → dev
docs/* → dev
refactor/* → dev
test/* → dev
chore/* → dev

Trước PR:
pull dev → rebase dev → resolve conflict → push

Chỉ rebase branch cá nhân.

Không rebase:
main
dev
branch đang được nhiều người cùng sử dụng.

dev ổn định:
dev → PR → main
```

Flow tổng thể:

```text
                    rebase dev
                        ↓
feat/auth ──────────────┐
feat/teacher ───────────┼──> PR → dev ───> PR → main
feat/assignment ────────┤
fix/login ──────────────┘
```

---

# 15. Hotfix sau khi đã phát hành

Chỉ sử dụng quy trình này khi lỗi nghiêm trọng xuất hiện trên phiên bản ở `main`.

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-login-error
```

Sau khi sửa và kiểm thử:

```text
hotfix/critical-login-error → Pull Request → main
```

Sau khi merge vào `main`:

1. Tạo patch tag, ví dụ `v1.0.1`.
2. Đồng bộ commit hotfix trở lại `dev` bằng Pull Request `main → dev` hoặc cherry-pick có kiểm soát.
3. Xóa hotfix branch.

Không merge hotfix chỉ vào `main` rồi bỏ quên `dev`, vì lỗi có thể xuất hiện trở lại ở lần phát hành sau.

---

# 16. Xử lý dữ liệu nhạy cảm

Trước mỗi commit:

```bash
git status
git diff --staged
```

Không commit:

* Mật khẩu hoặc token.
* File `.env` thật.
* Private key hoặc certificate bí mật.
* Database dump có dữ liệu cá nhân.
* Bảng phân công thật chưa được ẩn danh.

Nếu secret đã bị commit, không chỉ xóa file ở commit kế tiếp. Cần thu hồi hoặc đổi secret ngay và xử lý lịch sử Git theo quy trình được cả nhóm thống nhất.

---

# 17. Checklist trước khi merge

```text
[ ] Branch được tạo từ dev mới nhất
[ ] Phạm vi Pull Request tập trung vào một mục tiêu
[ ] Tác giả đã tự review diff
[ ] Không có secret hoặc dữ liệu thật chưa ẩn danh
[ ] Tài liệu liên quan đã được cập nhật
[ ] Ít nhất 1 approval
[ ] Tất cả conversation đã resolve
[ ] CI xanh khi CI đã được thiết lập
[ ] Tiêu đề Pull Request theo Conventional Commits
[ ] Chọn đúng Squash and merge vào dev
```

---

# 18. Trạng thái thiết lập repository

Thiết lập local ban đầu:

```bash
git init -b main
git add .
git commit -m "chore: initialize project structure"
git checkout -b dev
```

Khi đã tạo repository trên GitHub:

```bash
git remote add origin <repo-url>
git push -u origin main
git push -u origin dev
```

Sau đó cấu hình branch protection và merge strategy trên GitHub theo mục 2. Phần required status checks chỉ bật sau khi nhóm bổ sung CI.
