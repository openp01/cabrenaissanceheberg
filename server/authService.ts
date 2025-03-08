import bcrypt from "bcrypt";
import { db } from "./db";
import { users, User, InsertUser, UserRole } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Service d'authentification pour gérer les utilisateurs et les rôles
 */
export class AuthService {
  /**
   * Crée un nouvel utilisateur
   * @param userData Données de l'utilisateur à créer
   * @returns L'utilisateur créé
   */
  async createUser(userData: Omit<InsertUser, "passwordHash"> & { password: string }): Promise<User> {
    const { password, ...userDataWithoutPassword } = userData;
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error("Un utilisateur avec ce nom d'utilisateur existe déjà");
    }
    
    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Créer l'utilisateur dans la base de données
    const [newUser] = await db
      .insert(users)
      .values({
        ...userDataWithoutPassword,
        passwordHash,
      })
      .returning();
    
    return newUser;
  }
  
  /**
   * Récupère un utilisateur par son ID
   * @param id ID de l'utilisateur
   * @returns L'utilisateur ou undefined si non trouvé
   */
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return user;
  }
  
  /**
   * Récupère un utilisateur par son nom d'utilisateur
   * @param username Nom d'utilisateur
   * @returns L'utilisateur ou undefined si non trouvé
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    
    return user;
  }
  
  /**
   * Vérifie les identifiants d'un utilisateur
   * @param username Nom d'utilisateur
   * @param password Mot de passe
   * @returns L'utilisateur si les identifiants sont valides, null sinon
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    
    if (!user) {
      return null;
    }
    
    // Vérifier si le compte est actif
    if (!user.isActive) {
      return null;
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return null;
    }
    
    // Mettre à jour la date de dernière connexion
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));
    
    return user;
  }
  
  /**
   * Récupère tous les utilisateurs
   * @returns Liste des utilisateurs
   */
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  /**
   * Met à jour un utilisateur
   * @param id ID de l'utilisateur
   * @param userData Données à mettre à jour
   * @returns L'utilisateur mis à jour ou undefined si non trouvé
   */
  async updateUser(id: number, userData: Partial<User> & { password?: string }): Promise<User | undefined> {
    const { password, ...updateData } = userData;
    
    // Si un nouveau mot de passe est fourni, le hasher
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  /**
   * Désactive un utilisateur (alternative à la suppression)
   * @param id ID de l'utilisateur
   * @returns true si l'utilisateur a été désactivé, false sinon
   */
  async deactivateUser(id: number): Promise<boolean> {
    const [updatedUser] = await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, id))
      .returning();
    
    return !!updatedUser;
  }
  
  /**
   * Vérifie si un utilisateur a un rôle spécifique
   * @param userId ID de l'utilisateur
   * @param role Rôle à vérifier
   * @returns true si l'utilisateur a le rôle spécifié, false sinon
   */
  async hasRole(userId: number, role: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.role === role;
  }
}

// Exporter une instance unique du service d'authentification
export const authService = new AuthService();