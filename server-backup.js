const express = require("express");
const path = require("path");

const app = express();

const PORT = 3000;


// =====================================================
// CONFIGURACIÓN
// =====================================================

app.use(express.json());


// =====================================================
// ARCHIVOS ESTÁTICOS DEL SITIO
// =====================================================

app.use(express.static(
    path.join(__dirname, "..")
));


// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

app.get("/", function (req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "..",
            "index.html"
        )
    );

});


// =====================================================
// GENERAR NÚMERO DE ACREDITACIÓN
// =====================================================

function generarNumeroAcreditacion() {

    const numero =
        Math.floor(
            100000 +
            Math.random() * 900000
        );

    return "WSC27-" + numero;

}


// =====================================================
// GENERAR CÓDIGO DE SEGURIDAD
// =====================================================

function generarCodigoSeguridad() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo = "";

    for (let i = 0; i < 10; i++) {

        codigo +=
            caracteres.charAt(
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
    function (req, res) {

        console.log(
            "Nueva solicitud de acreditación:"
        );

        console.log(req.body);


        // -------------------------------------------------
        // DATOS RECIBIDOS
        // -------------------------------------------------

        const datos = req.body;


        // -------------------------------------------------
        // VALIDACIÓN
        // -------------------------------------------------

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


        // -------------------------------------------------
        // ACOMPAÑANTES
        // -------------------------------------------------

        const acompanantes =
            Number(datos.acompanantes || 0);


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


        // -------------------------------------------------
        // PRECIOS
        // -------------------------------------------------

        const precioAuto =
            12000;

        const precioAcompanante =
            3000;


        const total =
            precioAuto +
            (
                acompanantes *
                precioAcompanante
            );


        // -------------------------------------------------
        // IDENTIFICADORES
        // -------------------------------------------------

        const numeroAcreditacion =
            generarNumeroAcreditacion();


        const codigoSeguridad =
            generarCodigoSeguridad();


        // -------------------------------------------------
        // RESPUESTA
        // -------------------------------------------------

        const acreditacion = {

            numeroAcreditacion:
                numeroAcreditacion,

            codigoSeguridad:
                codigoSeguridad,

            datos: {

                nombre:
                    String(datos.nombre).trim(),

                dni:
                    String(datos.dni).trim(),

                telefono:
                    String(datos.telefono).trim(),

                instagram:
                    String(datos.instagram).trim(),

                marca:
                    String(datos.marca).trim(),

                modelo:
                    String(datos.modelo).trim(),

                anio:
                    String(datos.anio).trim(),

                patente:
                    String(datos.patente)
                        .trim()
                        .toUpperCase(),

                acompanantes:
                    acompanantes

            },

            precioAuto:
                precioAuto,

            precioAcompanante:
                precioAcompanante,

            total:
                total,

            estado:
                "PENDIENTE_PAGO"

        };


        console.log(
            "Acreditación creada:",
            acreditacion
        );


        res.status(201).json({

            ok: true,

            mensaje:
                "Acreditación creada correctamente.",

            acreditacion:
                acreditacion

        });

    }
);


// =====================================================
// INICIAR SERVIDOR
// =====================================================

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
            `Servidor funcionando en http://localhost:${PORT}`
        );

        console.log(
            "API de acreditaciones disponible."
        );

    }
);