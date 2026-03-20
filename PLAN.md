# Corriger la redirection du reset de mot de passe

## Problème
Le lien de réinitialisation de mot de passe redirige vers le site Rork au lieu de l'app Faso Auto-stop, car l'URL générée par `Linking.createURL` pointe vers l'environnement Expo/Rork.

## Corrections

### 1. Écran de connexion — lien de redirection
- Remplacer l'URL de redirection dynamique par le deep link fixe `fasoautostop://reset-password`
- Sur web, utiliser l'URL du site actuel (`window.location.origin + /reset-password`) pour que le lien fonctionne aussi dans un navigateur
- Supprimer l'import inutile de `expo-linking`

### 2. Configuration Supabase — détection de session dans l'URL
- Désactiver la détection automatique de session dans l'URL (`detectSessionInUrl: false`) sur **toutes les plateformes**
- Cela évite que Supabase consomme le hash avant que l'écran de reset puisse le lire
- L'écran de reset gère déjà manuellement l'extraction des tokens

### 3. Écran de reset de mot de passe
- Ajuster la logique web pour toujours parser le hash manuellement (puisque `detectSessionInUrl` est désactivé)
- Les 4 états (chargement, formulaire, succès, erreur) sont déjà bien en place — aucun changement visuel
- Ajouter des logs de debug pour faciliter le diagnostic

### 4. Écran principal (layout)
- Déjà correct : l'écran `reset-password` est accessible sans authentification et est déclaré dans le routeur
- Aucune modification nécessaire
