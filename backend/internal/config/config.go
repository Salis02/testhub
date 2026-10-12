package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	// Database
	DBHost       string
	DBPort       int
	DBUser       string
	DBPassword   string
	DBName       string
	DBPoolSize   int
	DBMaxIdle    int
	DBSSLMode    string

	// Redis
	RedisURL      string
	RedisPassword string

	// JWT
	JWTSecret          string
	JWTExpiry          time.Duration
	RefreshTokenExpiry time.Duration

	// Server
	Port        string
	Environment string
	LogLevel    string
	Domain      string

	// Rate Limiting
	RateLimitRequests int
	RateLimitWindow   time.Duration

	// AI Multi-Provider Config
	GeminiAPIKeys []string
	GeminiModel   string
	GroqAPIKeys   []string
	GroqModel     string
}

func LoadConfig() *Config {
	return &Config{
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnvInt("DB_PORT", 5432),
		DBUser:             getEnv("DB_USER", "postgres"),
		DBPassword:         getEnv("DB_PASSWORD", ""),
		DBName:             getEnv("DB_NAME", "testhub"),
		DBPoolSize:         getEnvInt("DB_POOL_SIZE", 20),
		DBMaxIdle:          getEnvInt("DB_MAX_IDLE_CONNS", 5),
		DBSSLMode:          getEnv("DB_SSL_MODE", "disable"),
		RedisURL:           getEnv("REDIS_URL", "localhost:6379"),
		RedisPassword:      getEnv("REDIS_PASSWORD", ""),
		JWTSecret:          getEnv("JWT_SECRET", "testhub-super-secret-jwt-key-production-ready-min-32-chars"),
		JWTExpiry:          getEnvDuration("JWT_EXPIRY", 24*time.Hour),
		RefreshTokenExpiry: getEnvDuration("REFRESH_TOKEN_EXPIRY", 7*24*time.Hour),
		Port:               getEnv("PORT", "8000"),
		Environment:        getEnv("ENVIRONMENT", "development"),
		LogLevel:           getEnv("LOG_LEVEL", "debug"),
		Domain:             getEnv("DOMAIN", "localhost"),
		RateLimitRequests:  getEnvInt("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindow:    time.Minute,
		GeminiAPIKeys:      getEnvSlice("GEMINI_API_KEYS", nil),
		GeminiModel:        getEnv("GEMINI_MODEL", "gemini-1.5-flash"),
		GroqAPIKeys:        getEnvSlice("GROQ_API_KEYS", nil),
		GroqModel:          getEnv("GROQ_MODEL", "llama-3.3-70b-versatile"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultVal
}

func getEnvSlice(key string, defaultVal []string) []string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	parts := strings.Split(val, ",")
	var result []string
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	if len(result) == 0 {
		return defaultVal
	}
	return result
}
