# Git Troubleshooting Guide - Xử lý lỗi Git thường gặp

## 📋 Mục lục
1. [Lỗi Merge Incomplete](#1-lỗi-merge-incomplete)
2. [Lỗi Swap File Conflict](#2-lỗi-swap-file-conflict)
3. [Lỗi Branch Not Updated](#3-lỗi-branch-not-updated)
4. [Lỗi Push Rejected](#4-lỗi-push-rejected)
5. [Lỗi Merge Conflicts](#5-lỗi-merge-conflicts)
6. [Best Practices](#6-best-practices)

---

## 1. Lỗi Merge Incomplete

### Triệu chứng:
```bash
fatal: You have not concluded your merge (MERGE_HEAD exists).
Please, commit your changes before you merge.
```

### Nguyên nhân:
- Merge bị dở dang (chưa complete)
- File `.git/MERGE_HEAD` vẫn còn tồn tại

### Giải pháp:

#### Option A: Complete merge hiện tại
```powershell
cd "d:\Github\GG Antigravity\PWA-Expenses Tracker"
git status
git commit -m "Complete merge"
git push origin main
```

#### Option B: Abort và merge lại
```powershell
git merge --abort
git merge develop --no-edit
git push origin main
```

#### Option C: Clean up manual (nếu abort không work)
```powershell
Remove-Item .git\MERGE_HEAD -Force
Remove-Item .git\MERGE_MSG -Force -ErrorAction SilentlyContinue
git reset --hard HEAD
git merge develop --no-edit
```

---

## 2. Lỗi Swap File Conflict

### Triệu chứng:
```
Swap file ".git/.MERGE_MSG.swp" already exists!
[O]pen Read-Only, (E)dit anyway, (R)ecover, (D)elete it, (Q)uit, (A)bort:
```

### Nguyên nhân:
- Vim/Vi editor bị crash trước đó
- Swap file không được cleanup

### Giải pháp:

#### Trong Vim:
1. Nhấn `D` (Delete swap file)
2. Nhấn `:wq` + Enter (save và exit)

#### Hoặc dùng VS Code:
1. Nhấn `Q` (Quit vim)
2. Mở VS Code Source Control
3. Click nút **"Continue"**

#### Hoặc xóa swap file manual:
```powershell
Remove-Item "d:\Github\GG Antigravity\.git\.MERGE_MSG.swp" -Force
git merge develop --no-edit
```

---

## 3. Lỗi Branch Not Updated

### Triệu chứng:
- Push thành công nhưng Vercel/Production không update
- `git log` trên main khác với remote

### Nguyên nhân:
- Local main chưa merge với develop
- Quên push sau khi merge

### Giải pháp:

#### Kiểm tra branch hiện tại:
```powershell
git branch
git log --oneline -5
```

#### Sync và merge đúng:
```powershell
# Đảm bảo ở branch main
git checkout main

# Pull latest từ remote
git pull origin main

# Merge develop vào main
git merge develop --no-edit

# Push lên remote
git push origin main
```

#### Verify trên remote:
```powershell
git log --oneline -3
# Hoặc check trên GitHub/Vercel
```

---

## 4. Lỗi Push Rejected

### Triệu chứng:
```bash
! [rejected]        main -> main (non-fast-forward)
error: failed to push some refs to 'origin'
```

### Nguyên nhân:
- Remote có commits mới hơn local
- Force push từ người khác

### Giải pháp:

#### Option A: Pull và merge (Safe)
```powershell
git pull origin main
git push origin main
```

#### Option B: Pull với rebase
```powershell
git pull --rebase origin main
git push origin main
```

#### Option C: Force push (⚠️ Nguy hiểm - chỉ dùng khi chắc chắn)
```powershell
git push origin main --force
```

---

## 5. Lỗi Merge Conflicts

### Triệu chứng:
```bash
Auto-merging file.js
CONFLICT (content): Merge conflict in file.js
Automatic merge failed; fix conflicts and then commit the result.
```

### Nguyên nhân:
- Cùng file được sửa ở cả 2 branches
- Git không thể tự động merge

### Giải pháp:

#### Bước 1: Kiểm tra conflicts
```powershell
git status
```

#### Bước 2: Resolve conflicts

**Option A: Dùng VS Code (Recommended)**
1. Mở file có conflict
2. Click **"Accept Current Change"** hoặc **"Accept Incoming Change"**
3. Hoặc edit manual

**Option B: Dùng merge tool**
```powershell
git mergetool
```

#### Bước 3: Complete merge
```powershell
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

#### Abort merge nếu muốn bỏ qua:
```powershell
git merge --abort
```

---

## 6. Best Practices

### ✅ Workflow chuẩn để tránh lỗi:

#### A. Trước khi merge:
```powershell
# 1. Commit tất cả changes trên develop
git checkout develop
git add .
git commit -m "Your message"
git push origin develop

# 2. Switch sang main và pull latest
git checkout main
git pull origin main

# 3. Merge develop vào main
git merge develop --no-edit

# 4. Resolve conflicts nếu có
# 5. Push main
git push origin main

# 6. Switch về develop (optional)
git checkout develop
```

#### B. Kiểm tra trước khi push:
```powershell
# Check branch hiện tại
git branch

# Check uncommitted changes
git status

# Check commit history
git log --oneline -5

# Check diff với remote
git diff origin/main
```

#### C. Set up Git để tránh vim:
```powershell
# Dùng VS Code làm editor mặc định
git config --global core.editor "code --wait"

# Hoặc dùng notepad
git config --global core.editor "notepad"

# Luôn dùng --no-edit khi merge
git merge develop --no-edit
```

---

## 🚨 Emergency Commands

### Reset về trạng thái clean:
```powershell
# Abort merge hiện tại
git merge --abort

# Discard tất cả local changes
git reset --hard HEAD

# Clean untracked files
git clean -fd

# Reset về remote state
git reset --hard origin/main
```

### Kiểm tra nhanh:
```powershell
# Tất cả trong 1 lệnh
cd "d:\Github\GG Antigravity\PWA-Expenses Tracker"; git status; git branch; git log --oneline -3
```

---

## 📝 Checklist trước khi Push

- [ ] `git status` - Không có uncommitted changes
- [ ] `git branch` - Đang ở đúng branch
- [ ] `git pull origin main` - Đã pull latest
- [ ] `git log --oneline -3` - Verify commits
- [ ] Test local trước khi push
- [ ] `git push origin main`
- [ ] Verify trên GitHub/Vercel

---

## 🔗 Quick Reference

| Lỗi | Command fix nhanh |
|-----|------------------|
| Merge incomplete | `git merge --abort` hoặc `git commit -m "Complete merge"` |
| Swap file exists | Nhấn `D` trong vim hoặc `Remove-Item .git\.*.swp` |
| Push rejected | `git pull origin main` rồi `git push origin main` |
| Merge conflict | Resolve trong VS Code, rồi `git add .` và `git commit` |
| Wrong branch | `git checkout main` |
| Want to undo | `git reset --hard HEAD` hoặc `git merge --abort` |

---

## 💡 Tips

1. **Luôn commit trên develop trước khi merge**
2. **Dùng VS Code Source Control thay vì terminal để merge**
3. **Set `core.editor` để tránh vim**
4. **Dùng `--no-edit` flag khi merge để skip message editor**
5. **Verify trên Vercel/GitHub sau khi push**
6. **Backup quan trọng trước khi force push**

---

**Last Updated**: January 19, 2026  
**Project**: PWA Expenses Tracker  
**Author**: DoanGoodman
