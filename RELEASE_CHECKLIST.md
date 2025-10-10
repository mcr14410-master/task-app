# Release Checklist – Task App

Use this checklist to cut clean releases fast (Windows / Eclipse friendly).

---

## 0) Preconditions
- [ ] Working tree clean (`git status`)
- [ ] Stable build on your machine (frontend + backend)
- [ ] Java 17 available (`java -version`)

---

## 1) Create release branch
```powershell
git checkout -b release/vX.Y.Z
```
*(Example: `v0.5.0`)*

---

## 2) Bump versions

### Backend (Maven) – in Eclipse (m2e)
1. Project Explorer → select **backend**
2. **Run As → Maven build…**
   - **Goals:** `versions:set -DnewVersion=X.Y.Z`
3. **Run As → Maven build…**
   - **Goals:** `versions:commit`
4. **Maven → Update Project…** (refresh workspace)

> CLI alternative from repo root (PowerShell):
```powershell
mvn -q -f backend/pom.xml versions:set -DnewVersion=X.Y.Z
mvn -q -f backend/pom.xml versions:commit
```

### Frontend
- Edit `frontend/package.json` → `"version": "X.Y.Z"`
- Or (PowerShell):
```powershell
cd frontend
npm version X.Y.Z --no-git-tag-version
cd ..
```

---

## 3) Update CHANGELOG (optional but recommended)
Add a new section on top, e.g.:
```
## [X.Y.Z] - YYYY-MM-DD
- Short bullets of notable changes
```

---

## 4) Commit
```powershell
git add .
git commit -m "chore(release): bump versions to X.Y.Z"
```

---

## 5) Tag & push
```powershell
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin release/vX.Y.Z
git push origin vX.Y.Z
```

---

## 6) Build artifacts

### Backend package (Maven)
```powershell
mvn -q -f backend/pom.xml clean package
```

### Docker (if you ship images)
```powershell
docker compose build
docker compose up -d
```

---

## 7) Smoke tests (quick manual)
- [ ] Frontend opens without console errors
- [ ] GET `/api/tasks` returns 200 in Network tab
- [ ] Create / Edit / Delete task → UI updates accordingly
- [ ] DnD between columns works (and persists)
- [ ] No CORS errors (preflight to `/api/tasks/sort` returns 200/204)

**CLI preflight check** (adjust host/ports if needed):
```powershell
curl -i -X OPTIONS http://nb01:8081/api/tasks/sort `
  -H "Origin: http://nb01:8081" `
  -H "Access-Control-Request-Method: PUT"
```

---

## 8) (Optional) GitHub Release
- Create a Release from tag `vX.Y.Z`
- Paste highlights from CHANGELOG
- Attach binaries/images if you publish them

---

## 9) Rollback (if required)
```powershell
git checkout main
git reset --hard v<previous-stable>
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
```
*(Or cherry-pick fixes onto a hotfix branch as needed.)*

---

## Notes
- Keep CORS config minimal and predictable (GlobalCorsConfig + AppCorsProperties).
- For experiments (SSE, etc.) always use feature branches and toggle with `.env` flags.
