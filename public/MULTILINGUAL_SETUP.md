# Multilingual Support Setup Guide - PiPilot Apps

## How to implement multilanguage upport to any app. 

Below are instructions that will help you  implement multilingual support using a **single global context file** (`LanguageContext.tsx`) that provides a simple, lightweight translation system without external dependencies like react-i18next.

### Architecture

```
src/contexts/LanguageContext.tsx (Single Global Context)
├── LanguageContextType interface
├── translations object (hardcoded English/French)
├── LanguageProvider component
└── useLanguage hook
```

## Implementation Details

### 1. Core Context Structure

The entire multilingual system is contained in one file: `src/contexts/LanguageContext.tsx`

```typescript
// Interface defining the context shape
interface LanguageContextType {
  language: 'en' | 'fr';
  setLanguage: (lang: 'en' | 'fr') => void;
  t: (key: string) => string;
}

// Create the context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
```

### 2. Translations Object

All translations are hardcoded in a single object:

```typescript
const translations = {
  en: {
    // English translations...
    nav: {
      home: "Home",
      vehicles: "Vehicles",
      about: "About",
      contact: "Contact",
      login: "Login",
      register: "Register"
    },
    // ... more translations
  },
  fr: {
    // French translations...
    nav: {
      home: "Accueil",
      vehicles: "Véhicules",
      about: "À propos",
      contact: "Contact",
      login: "Connexion",
      register: "S'inscrire"
    },
    // ... more translations
  }
};
```

### 3. Provider Component

```typescript
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // State with localStorage persistence
  const [language, setLanguage] = useState<'en' | 'fr'>(() => {
    const saved = localStorage.getItem('language');
    return (saved as 'en' | 'fr') || 'en';
  });

  // Persist language changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Translation function
  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  const value = {
    language,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
```

### 4. Consumer Hook

```typescript
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
```

## Setup Steps

### Step 1: Create the Context File

Create `src/contexts/LanguageContext.tsx` with the complete implementation above.

### Step 2: Wrap App with Provider

In `src/main.tsx` or `src/App.tsx`:

```typescript
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      {/* Your app content */}
    </LanguageProvider>
  );
}
```

### Step 3: Use in Components

```typescript
import { useLanguage } from '../contexts/LanguageContext';

function MyComponent() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <h1>{t('nav.home')}</h1>
      <button onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}>
        {t('switchLanguage')}
      </button>
    </div>
  );
}
```

### Step 4: Add Translation Keys

Add new translation keys to the `translations` object in `LanguageContext.tsx`:

```typescript
const translations = {
  en: {
    // ... existing keys
    newFeature: "New Feature",
    // ... nested objects
    dashboard: {
      welcome: "Welcome back!",
      stats: "Your Statistics"
    }
  },
  fr: {
    // ... existing keys
    newFeature: "Nouvelle Fonctionnalité",
    // ... nested objects
    dashboard: {
      welcome: "Bienvenue !",
      stats: "Vos Statistiques"
    }
  }
};
```

## Usage Examples

### Basic Translation

```typescript
const { t } = useLanguage();
return <h1>{t('nav.home')}</h1>;
```

### Language Switching

```typescript
const { language, setLanguage } = useLanguage();
return (
  <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'fr')}>
    <option value="en">English</option>
    <option value="fr">Français</option>
  </select>
);
```

### Conditional Rendering

```typescript
const { language } = useLanguage();
return (
  <div>
    {language === 'en' ? 'Hello' : 'Bonjour'}
  </div>
);
```

## Advanced Configuration

### Adding More Languages

1. Update the interface: `language: 'en' | 'fr' | 'es';`
2. Add translations object: `es: { ... }`
3. Update state initialization and localStorage logic

### Nested Translation Keys

```typescript
// In translations object
en: {
  user: {
    profile: {
      name: "Name",
      email: "Email"
    }
  }
}

// Usage
t('user.profile.name') // Access nested keys
```

### Dynamic Translations

```typescript
const t = (key: string, variables?: Record<string, string>) => {
  let translation = translations[language][key as keyof typeof translations.en] || key;

  if (variables) {
    Object.entries(variables).forEach(([varKey, value]) => {
      translation = translation.replace(`{{${varKey}}}`, value);
    });
  }

  return translation;
};

// Usage
t('welcome', { name: 'John' }) // "Welcome, John!"
```

## Testing Guidelines

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './LanguageContext';

test('should provide default language', () => {
  const { result } = renderHook(() => useLanguage(), {
    wrapper: LanguageProvider
  });

  expect(result.current.language).toBe('en');
});

test('should translate keys', () => {
  const { result } = renderHook(() => useLanguage(), {
    wrapper: LanguageProvider
  });

  expect(result.current.t('nav.home')).toBe('Home');
});
```

### Integration Tests

```typescript
test('language switch persists', () => {
  const { result } = renderHook(() => useLanguage(), {
    wrapper: LanguageProvider
  });

  act(() => {
    result.current.setLanguage('fr');
  });

  expect(result.current.language).toBe('fr');
  expect(localStorage.getItem('language')).toBe('fr');
});
```

## Best Practices

### 1. Key Naming Convention

- Use dot notation for nested keys: `nav.home`, `dashboard.welcome`
- Use camelCase for key names: `userProfile`, `contactForm`
- Keep keys descriptive but concise

### 2. Translation Management

- Group related translations: `nav.*`, `form.*`, `error.*`
- Use consistent terminology across languages
- Avoid duplicating text - use references when possible

### 3. Performance

- Translations are loaded synchronously (no async operations)
- Context re-renders only when language changes
- Minimal bundle size impact (no external dependencies)

### 4. Maintenance

- Keep all translations in one file for easy management
- Use TypeScript for type safety
- Document new translation keys

## Troubleshooting

### Common Issues

**"useLanguage must be used within a LanguageProvider"**
- Ensure your component is wrapped with `<LanguageProvider>`

**Translation key not found**
- Check spelling in translations object
- Verify key exists for both languages

**Language not persisting**
- Check localStorage is available
- Ensure no other code is clearing localStorage

**TypeScript errors**
- Update interface when adding new properties
- Use proper typing for translation keys

### Debugging

```typescript
// Debug current language state
const { language, t } = useLanguage();
console.log('Current language:', language);
console.log('Translation for nav.home:', t('nav.home'));

// Check if key exists
const debugTranslation = (key: string) => {
  const exists = key in translations[language];
  console.log(`Key "${key}" exists:`, exists);
  return exists ? translations[language][key] : `MISSING: ${key}`;
};
```

## Future Enhancements

### Potential Improvements

1. **External Translation Files**
   - Move translations to JSON files
   - Implement lazy loading for translations

2. **Pluralization Support**
   - Add plural forms for different languages
   - Implement ICU message format

3. **RTL Language Support**
   - Add direction detection
   - Support Arabic, Hebrew, etc.

4. **Translation Management System**
   - Admin interface for editing translations
   - Integration with translation services

5. **Interpolation & Formatting**
   - Advanced variable replacement
   - Date/number formatting per locale

## Resources

- [React Context Documentation](https://react.dev/reference/react/createContext)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

*This implementation provides a simple, maintainable multilingual solution without external dependencies, perfect for small to medium React applications.*