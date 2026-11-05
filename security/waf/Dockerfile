# Current stable CRS 4.29.0 / Nginx Alpine image, pinned to a dated build.
FROM owasp/modsecurity-crs:4.29.0-nginx-alpine-202609180209

# Keep the image's supported templating/entrypoint mechanism.
COPY nginx/default.conf.template /etc/nginx/templates/conf.d/default.conf.template
COPY nginx/proxy_backend.conf.template /etc/nginx/templates/includes/proxy_backend.conf.template

# App-specific policy + CRS-supported tuning locations.
COPY rules/REQUEST-899-CUSTOM.conf /etc/modsecurity.d/owasp-crs/rules/REQUEST-899-CUSTOM.conf
COPY rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf /etc/modsecurity.d/owasp-crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf
COPY rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf /etc/modsecurity.d/owasp-crs/rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf
