package validator

import (
	"errors"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

// ValidationErrorResponse represents standard structured validation error JSON
type ValidationErrorResponse struct {
	Error   string            `json:"error"`
	Details map[string]string `json:"details"`
}

// FormatValidationErrors formats go-playground validator errors into human-friendly messages
func FormatValidationErrors(err error) map[string]string {
	fieldErrors := make(map[string]string)

	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		for _, fe := range ve {
			field := toSnakeCase(fe.Field())
			switch fe.Tag() {
			case "required":
				fieldErrors[field] = fmt.Sprintf("Kolom '%s' wajib diisi", field)
			case "min":
				fieldErrors[field] = fmt.Sprintf("Kolom '%s' minimal bernilai atau berpanjang %s", field, fe.Param())
			case "max":
				fieldErrors[field] = fmt.Sprintf("Kolom '%s' maksimal bernilai atau berpanjang %s", field, fe.Param())
			case "oneof":
				options := strings.ReplaceAll(fe.Param(), " ", ", ")
				fieldErrors[field] = fmt.Sprintf("Kolom '%s' harus berupa salah satu dari: %s", field, options)
			case "email":
				fieldErrors[field] = "Format email tidak valid"
			default:
				fieldErrors[field] = fmt.Sprintf("Nilai kolom '%s' tidak valid (%s)", field, fe.Tag())
			}
		}
	} else if err != nil {
		fieldErrors["payload"] = err.Error()
	}

	return fieldErrors
}

func toSnakeCase(str string) string {
	var matchFirstCap = true
	var result strings.Builder
	for i, r := range str {
		if r >= 'A' && r <= 'Z' {
			if i > 0 && !matchFirstCap {
				result.WriteRune('_')
			}
			result.WriteRune(r + ('a' - 'A'))
			matchFirstCap = true
		} else {
			result.WriteRune(r)
			matchFirstCap = false
		}
	}
	return result.String()
}
