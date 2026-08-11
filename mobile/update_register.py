import re

with open('src/screens/RegisterScreen.js', 'r') as f:
    content = f.read()

# Replace Header
header_replacement = """    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.greetingText}>Create your account</Text>
            <Text style={styles.welcomeText}>Provide your details to create your account and get started.</Text>
        </View>
    );"""
content = re.sub(r'    const renderHeader = \(\) => \([\s\S]*?\n    \);', header_replacement, content)

# Add Social Row in Step 2 (before form fields)
social_row = """
                        <View style={styles.socialRow}>
                            <TouchableOpacity style={styles.socialButton} onPress={() => Toast.show({type: 'info', text1: 'Coming Soon', text2: 'Google login is not yet implemented'})}>
                                <Text style={styles.googleG}>G</Text>
                                <Text style={styles.socialText}>Google</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.socialButton} onPress={() => Toast.show({type: 'info', text1: 'Coming Soon', text2: 'Apple login is not yet implemented'})}>
                                <Text style={styles.appleIcon}></Text>
                                <Text style={styles.socialText}>Apple</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>
"""
content = content.replace("<Text style={styles.roleLabel}>Registering as {formData.role.toLowerCase()}</Text>",
                           "<Text style={styles.roleLabel}>Registering as {formData.role.toLowerCase()}</Text>" + social_row)

# Replace inputs with labeled versions
def replace_input(match):
    placeholder = match.group(1)
    value_bind = match.group(2)
    extra = match.group(3)
    
    label_map = {
        'Username': 'Full Name',
        'Email Address': 'Email Address',
        'Mobile number': 'Phone Number',
        'Password': 'Password',
        'Confirm Password': 'Confirm Password',
        'Vehicle Type (e.g. TRUCK)': 'Vehicle Type',
        'License Plate': 'License Plate',
        'Company Name': 'Company Name',
        'Tax ID': 'Tax ID',
        'National ID': 'National ID'
    }
    
    label = label_map.get(placeholder, placeholder)
    
    # We will remove the iconContainer completely
    return f"""                            <View style={{ marginBottom: 15 }}>
                                <Text style={{ fontSize: 14, color: '#333', marginBottom: 8, marginLeft: 4, fontWeight: '500' }}>{label}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 30, height: 56, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: {{ width: 0, height: 2 }}, shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 }}>
                                    <TextInput
                                        style={{ flex: 1, fontSize: 15, color: '#333', height: '100%' }}
                                        placeholder="{placeholder}"
                                        placeholderTextColor="#999"
                                        value={{{value_bind}}}
                                        {extra}
                                    />
                                </View>
                            </View>"""

# Using regex to replace the old inputWrappers manually would be fragile because of the nested views.
# Instead, I will write a custom replace block for the whole form fields section if possible, or just use regex on the most common input wrapper structure.
