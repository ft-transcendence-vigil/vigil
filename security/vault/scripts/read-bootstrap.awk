# Parse only the six bootstrap secrets, never shell-evaluate .env contents.
# Compose interpolation/escape sequences and multiline values must be resolved by
# the operator first; rejecting them is safer than importing a different password.
function trim(s) {
    sub(/^[ \t]+/, "", s)
    sub(/[ \t]+$/, "", s)
    return s
}
function fail(name, reason) {
    print "[vault-init] " name ": " reason " (bootstrap line " NR ")" > "/dev/stderr"
    failed = 1
    exit 1
}
BEGIN {
    count = split("JWT_SECRET POSTGRES_PASSWORD CLICKHOUSE_PASSWORD CLICKHOUSE_API_PASSWORD CLICKHOUSE_WRITER_PASSWORD VIGIL_INGESTION_KEY", keys, " ")
    for (i = 1; i <= count; i++) wanted[keys[i]] = 1
    single_quote = sprintf("%c", 39)
}
{
    sub(/\r$/, "")
    line = trim($0)
    sub(/^export[ \t]+/, "", line)
    equals = index(line, "=")
    if (!equals) next
    name = trim(substr(line, 1, equals - 1))
    if (!(name in wanted)) next
    value = trim(substr(line, equals + 1))
    quote = substr(value, 1, 1)
    if (quote == single_quote || quote == "\"") {
        closing = index(substr(value, 2), quote)
        if (!closing) fail(name, "unterminated or multiline quoted value")
        rest = trim(substr(value, closing + 2))
        if (rest != "" && substr(rest, 1, 1) != "#") fail(name, "unsupported text after quoted value")
        value = substr(value, 2, closing - 1)
        if (quote == "\"" && (index(value, "$") || index(value, "\\")))
            fail(name, "resolve double-quoted interpolation/escapes before importing")
    } else {
        sub(/[ \t]+#.*/, "", value)
        value = trim(value)
        if (index(value, "$") || index(value, "\\") || index(value, "\"") || index(value, single_quote))
            fail(name, "use a single-quoted literal or resolve interpolation/escapes before importing")
    }
    if (value ~ /^[[:space:]]*$/) fail(name, "empty or blank secret")
    if (name == "VIGIL_INGESTION_KEY" && value ~ /[[:space:]]/)
        fail(name, "bearer tokens must not contain whitespace")
    values[name] = value
}
END {
    if (failed) exit 1
    for (i = 1; i <= count; i++) {
        name = keys[i]
        if (!(name in values)) {
            print "[vault-init] Missing " name " in bootstrap .env" > "/dev/stderr"
            exit 1
        }
    }
    for (i = 1; i <= count; i++) {
        name = keys[i]
        file = output_dir "/" name
        printf "%s", values[name] > file
        close(file)
    }
}
