const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

// =====================================================
// SUPABASE
// =====================================================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// =====================================================
// RUTA PRINCIPAL DEL PROYECTO
// =====================================================

const ROOT = process.cwd();

// =====================================================
// ARCHIVOS DEL SITIO
// =====================================================

app.use(express.static(ROOT));

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

app.get("/", function (req, res) {

    res.sendFile(
        path.join(ROOT, "index.html")
    );

});

// =====================================================
// PÁGINA PAGO EXITOSO
// =====================================================

app.get("/pago-exitoso.html", function (req, res) {

    res.sendFile(
        path.join(ROOT, "pago-exitoso.html")
    );

});

// =====================================================
// API — COMPROBAR SERVIDOR
// =====================================================

app.get("/api/estado", function (req, res) {

    res.json({

        ok: true,

        servidor: "WOLF SHOWCARS",

        estado: "FUNCIONANDO",

        fecha: new Date().toISOString()

    });

});

// =====================================================
// GENERAR NÚMERO DE ACREDITACIÓN
// =====================================================

function generarNumeroAcreditacion() {

    return "WSC27-" +
        Math.floor(
            100000 +
            Math.random() * 900000
        );

}

// =====================================================
// GENERAR CÓDIGO DE SEGURIDAD
// =====================================================

function generarCodigoSeguridad() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo = "";

    for (let i = 0; i < 10; i++) {

        codigo += caracteres.charAt(
            Math.floor(
                Math.random() *
                caracteres.length
            )
        );

    }

    return codigo;

}

// =====================================================
// API — CREAR ACREDITACIÓN
// =====================================================

app.post(
    "/api/acreditaciones",
    async function (req, res) {

        try {

            console.log(
                "=========================================="
            );

            console.log(
                "NUEVA SOLICITUD DE ACREDITACIÓN"
            );

            console.log(
                req.body
            );

            const datos = req.body;

            // =================================================
            // CAMPOS OBLIGATORIOS
            // =================================================

            const camposObligatorios = [

                "nombre",
                "dni",
                "telefono",
                "instagram",
                "marca",
                "modelo",
                "anio",
                "patente"

            ];

            for (
                const campo of camposObligatorios
            ) {

                if (
                    !datos[campo] ||
                    String(datos[campo]).trim() === ""
                ) {

                    return res.status(400).json({

                        ok: false,

                        mensaje:
                            "Falta completar el campo: " +
                            campo

                    });

                }

            }

            // =================================================
            // ACOMPAÑANTES
            // =================================================

            const acompanantes =
                Number(
                    datos.acompanantes || 0
                );

            if (
                !Number.isInteger(acompanantes) ||
                acompanantes < 0
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "La cantidad de acompañantes no es válida."

                });

            }

            // =================================================
            // PRECIOS
            // =================================================

            const precioAuto = 12000;

            const precioAcompanante = 3000;

            const total =
                precioAuto +
                (
                    acompanantes *
                    precioAcompanante
                );

            // =================================================
            // IDENTIFICADORES
            // =================================================

            const numeroAcreditacion =
                generarNumeroAcreditacion();

            const codigoSeguridad =
                generarCodigoSeguridad();

            // =================================================
            // LIMPIAR DATOS
            // =================================================

            const nombre =
                String(datos.nombre).trim();

            const dni =
                String(datos.dni).trim();

            const telefono =
                String(datos.telefono).trim();

            const instagram =
                String(datos.instagram).trim();

            const marca =
                String(datos.marca).trim();

            const modelo =
                String(datos.modelo).trim();

            const anio =
                String(datos.anio).trim();

            const patente =
                String(datos.patente)
                    .trim()
                    .toUpperCase();

            // =================================================
            // GUARDAR EN SUPABASE
            // =================================================

            const { data, error } =
                await supabase
                    .from("acreditaciones")
                    .insert([

                        {

                            numero_acreditacion:
                                numeroAcreditacion,

                            codigo_seguridad:
                                codigoSeguridad,

                            nombre,
                            dni,
                            telefono,
                            instagram,
                            marca,
                            modelo,
                            anio,
                            patente,

                            acompanantes,

                            precio_auto:
                                precioAuto,

                            precio_acompanante:
                                precioAcompanante,

                            total,

                            estado:
                                "PENDIENTE_PAGO"

                        }

                    ])
                    .select()
                    .single();

            // =================================================
            // ERROR SUPABASE
            // =================================================

            if (error) {

                console.error(
                    "ERROR SUPABASE:"
                );

                console.error(error);

                return res.status(500).json({

                    ok: false,

                    mensaje:
                        "No se pudo guardar la acreditación en la base de datos.",

                    error:
                        error.message

                });

            }

            // =================================================
            // ACREDITACIÓN
            // =================================================

            const acreditacion = {

                numeroAcreditacion,

                codigoSeguridad,

                datos: {

                    nombre,
                    dni,
                    telefono,
                    instagram,
                    marca,
                    modelo,
                    anio,
                    patente,
                    acompanantes

                },

                precioAuto,

                precioAcompanante,

                total,

                estado:
                    "PENDIENTE_PAGO"

            };

            // =================================================
            // CONSOLA
            // =================================================

            console.log(
                "ACREDITACIÓN GUARDADA CORRECTAMENTE"
            );

            console.log(
                "Número:",
                numeroAcreditacion
            );

            console.log(
                "Código:",
                codigoSeguridad
            );

            console.log(
                "Total:",
                total
            );

            if (data) {

                console.log(
                    "ID SUPABASE:",
                    data.id
                );

            }

            console.log(
                "=========================================="
            );

            // =================================================
            // RESPUESTA
            // =================================================

            return res.status(201).json({

                ok: true,

                mensaje:
                    "Acreditación creada correctamente.",

                acreditacion

            });

        } catch (error) {

            console.error(
                "ERROR GENERAL DEL SERVIDOR:"
            );

            console.error(error);

            return res.status(500).json({

                ok: false,

                mensaje:
                    "Ocurrió un error interno en el servidor.",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    function () {

        console.log(
            "=========================================="
        );

        console.log(
            " WOLF SHOWCARS — SERVIDOR"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "Servidor funcionando en puerto:"
        );

        console.log(PORT);

        console.log(
            "Supabase conectado."
        );

        console.log(
            "Directorio raíz:"
        );

        console.log(ROOT);

        console.log(
            "=========================================="
        );

    }
);
