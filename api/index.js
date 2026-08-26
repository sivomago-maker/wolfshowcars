const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Archivos del sitio
app.use(express.static(path.join(__dirname, "..", "..")));

// Página principal
app.get("/", function (req, res) {
    res.sendFile(
        path.join(__dirname, "..", "..", "index.html")
    );
});

// API — comprobar servidor
app.get("/api/estado", function (req, res) {
    res.json({
        ok: true,
        servidor: "WOLF SHOWCARS",
        estado: "FUNCIONANDO",
        fecha: new Date().toISOString()
    });
});

// API — crear acreditación
app.post("/api/acreditaciones", async function (req, res) {

    try {

        const datos = req.body;

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

        for (const campo of camposObligatorios) {

            if (
                !datos[campo] ||
                String(datos[campo]).trim() === ""
            ) {

                return res.status(400).json({
                    ok: false,
                    mensaje: "Falta completar el campo: " + campo
                });

            }

        }

        const acompanantes =
            Number(datos.acompanantes || 0);

        if (
            !Number.isInteger(acompanantes) ||
            acompanantes < 0
        ) {

            return res.status(400).json({
                ok: false,
                mensaje: "La cantidad de acompañantes no es válida."
            });

        }

        const precioAuto = 12000;
        const precioAcompanante = 3000;

        const total =
            precioAuto +
            acompanantes * precioAcompanante;

        function generarNumeroAcreditacion() {

            return "WSC27-" +
                Math.floor(
                    100000 +
                    Math.random() * 900000
                );

        }

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

        const numeroAcreditacion =
            generarNumeroAcreditacion();

        const codigoSeguridad =
            generarCodigoSeguridad();

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

        if (error) {

            console.error(error);

            return res.status(500).json({
                ok: false,
                mensaje:
                    "No se pudo guardar la acreditación en la base de datos.",
                error: error.message
            });

        }

        return res.status(201).json({

            ok: true,

            mensaje:
                "Acreditación creada correctamente.",

            acreditacion: {

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
            }
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            ok: false,

            mensaje:
                "Ocurrió un error interno en el servidor.",

            error:
                error.message
        });

    }

});

module.exports = app;