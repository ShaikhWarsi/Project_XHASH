Add-Content -Path README.md -Value "`n# X_KA_HASH"
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Rachit-Tiwari-7/X_KA_HASH.git
git push -u origin main

$files = git ls-files --others --exclude-standard
foreach ($file in $files) {
    if ($file -ne "README.md") {
        git add $file
        git commit -m "Add $file"
    }
}
git push origin main
