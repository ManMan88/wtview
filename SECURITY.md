# Security Policy

## Supported Versions

The following versions of Worktree Viewer are currently supported with security updates:

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a Vulnerability

We take the security of Worktree Viewer seriously. If you discover a security vulnerability, please report it responsibly by emailing **rondanon@gmail.com** instead of using the public issue tracker.

### What to Include in Your Report

Please provide the following information to help us understand and address the vulnerability:

- **Description:** A clear description of the vulnerability
- **Affected Version(s):** Which version(s) of Worktree Viewer are affected
- **Steps to Reproduce:** Detailed steps to reproduce the issue (if applicable)
- **Potential Impact:** Description of the security impact and potential consequences
- **Suggested Fix:** Any suggested remediation (optional but appreciated)
- **Contact Information:** Your preferred contact method for follow-up communication

### Response Timeline

We are committed to addressing security vulnerabilities promptly:

- **48-hour Acknowledgment:** You will receive acknowledgment of your report within 48 hours
- **7-day Progress Updates:** We will provide progress updates on the vulnerability assessment and fix within 7 days of initial report
- **Coordinated Disclosure:** We will work with you to establish a reasonable timeline for public disclosure after a fix is released

## Security Considerations

### User Data

- Worktree Viewer operates on local repositories and does not transmit user data to external servers
- All git operations are performed locally on your machine
- Repository paths and worktree information remain on your system

### Dependencies

We regularly monitor our dependencies for known vulnerabilities through:
- Automated dependency scanning
- Manual security reviews of critical dependencies
- Prompt updates when vulnerabilities are discovered

### Cryptography

Worktree Viewer does not implement custom cryptographic algorithms. It relies on:
- Git's built-in credential management and authentication
- System credentials storage (git credential helpers)
- TLS/SSL for remote git operations (handled by git and underlying system libraries)

## Credits

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities. Contributors who report security issues will be credited (unless they prefer to remain anonymous) in our release notes and documentation.

---

**Last Updated:** February 2026

For questions about this security policy, please contact rondanon@gmail.com
