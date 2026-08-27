def normalize_gh_phone(value):
    """
    Normalize a Ghanaian phone number to its bare-digits form (233XXXXXXXXX),
    matching the convention used across registration, login, and OTP lookups.
    """
    if not value:
        return value

    clean = value.lstrip('+').replace(' ', '')
    if clean.startswith('0'):
        return '233' + clean[1:]
    if len(clean) == 9:
        return '233' + clean
    return clean
