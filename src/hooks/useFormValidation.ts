// hooks/useFormValidation.ts
import { useState, useCallback } from 'react';
import { z } from 'zod';

type ValidationErrors = Record<string, string[]>;

export const useFormValidation = <T>(schema: z.ZodSchema<T>) => {
    const [errors, setErrors] = useState<ValidationErrors>({});

    const validateField = useCallback((field: string, value: any) => {
        try {
            // Create a partial schema for single field validation
            const fieldSchema = z.object({ [field]: schema.shape[field as keyof typeof schema.shape] });
            fieldSchema.parse({ [field]: value });

            // Clear error if validation passes
            setErrors(prev => {
                const { [field]: _, ...rest } = prev;
                return rest;
            });

            return true;
        } catch (error) {
            if (error instanceof z.ZodError) {
                setErrors(prev => ({
                    ...prev,
                    [field]: error.errors.map(e => e.message)
                }));
            }
            return false;
        }
    }, [schema]);

    const validateForm = useCallback((data: Partial<T>) => {
        try {
            schema.parse(data);
            setErrors({});
            return { valid: true, errors: {} };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const formattedErrors: ValidationErrors = {};
                error.errors.forEach(err => {
                    const field = err.path.join('.');
                    if (!formattedErrors[field]) {
                        formattedErrors[field] = [];
                    }
                    formattedErrors[field].push(err.message);
                });
                setErrors(formattedErrors);
                return { valid: false, errors: formattedErrors };
            }
            return { valid: false, errors: {} };
        }
    }, [schema]);

    const clearErrors = useCallback(() => {
        setErrors({});
    }, []);

    const clearFieldError = useCallback((field: string) => {
        setErrors(prev => {
            const { [field]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    const getFieldError = useCallback((field: string) => {
        return errors[field]?.[0] || null;
    }, [errors]);

    return {
        errors,
        validateField,
        validateForm,
        clearErrors,
        clearFieldError,
        getFieldError,
        hasErrors: Object.keys(errors).length > 0,
    };
};
