I didn't add anything. This repository is on GitLab: its `origin` remote is gitlab.com, and it builds with `.gitlab-ci.yml`. `/doc-detective-install-github-action` sets up GitHub Actions only, and a GitHub workflow would never run here.

To run Doc Detective in GitLab CI, add a job to `.gitlab-ci.yml` that uses a Node.js 24 image and runs `npx doc-detective@5`. It picks up `.doc-detective.json`. Want me to draft that job?
